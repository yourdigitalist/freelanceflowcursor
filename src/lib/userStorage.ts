import { supabase, supabaseAnonKey } from '@/integrations/supabase/client';

export const MAX_USER_STORAGE_BYTES = 200 * 1024 * 1024;

export type UserStorageFile = {
  id: string;
  name: string;
  category: string;
  size: number;
  bucket: string;
  path: string;
  previewUrl: string | null;
  canDelete: boolean;
};

type StorageObjectRow = {
  name: string;
  id?: string | null;
  metadata?: { size?: number } | null;
};

async function listFolder(
  bucket: string,
  folder: string,
): Promise<Array<{ path: string; name: string; size: number }>> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 500 });
  if (error || !data?.length) return [];

  const results: Array<{ path: string; name: string; size: number }> = [];
  for (const item of data as StorageObjectRow[]) {
    if (!item.name || item.name === '.emptyFolderPlaceholder') continue;
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id == null) {
      const nested = await listFolder(bucket, fullPath);
      results.push(...nested);
    } else {
      results.push({
        path: fullPath,
        name: item.name,
        size: Number(item.metadata?.size || 0),
      });
    }
  }
  return results;
}

function publicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function signedUrl(bucket: string, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export async function listUserStorageFiles(userId: string): Promise<UserStorageFile[]> {
  const files: UserStorageFile[] = [];

  const [businessLogos, proposalImages, clientLogos, reviewFilesRes, avatarFiles] = await Promise.all([
    listFolder('business-logos', userId),
    listFolder('proposal-images', userId),
    listFolder('client-logos', userId),
    supabase
      .from('review_requests')
      .select('id')
      .eq('user_id', userId)
      .then(async ({ data: requests }) => {
        const requestIds = (requests || []).map((r) => r.id);
        if (!requestIds.length) return [];
        const { data } = await supabase
          .from('review_files')
          .select('id, file_name, file_size, file_url, review_request_id, review_requests(title)')
          .in('review_request_id', requestIds);
        return data || [];
      }),
    listFolder('avatars', userId),
  ]);

  for (const file of businessLogos) {
    const label = file.name.includes('email-logo') ? 'Email logo (secondary)' : 'Company logo';
    files.push({
      id: `business-logos:${file.path}`,
      name: `${label} · ${file.name}`,
      category: 'Branding',
      size: file.size,
      bucket: 'business-logos',
      path: file.path,
      previewUrl: publicUrl('business-logos', file.path),
      canDelete: true,
    });
  }

  for (const file of proposalImages) {
    const isDefault = file.name.includes('proposal-default-cover');
    files.push({
      id: `proposal-images:${file.path}`,
      name: isDefault ? `Proposal default cover · ${file.name}` : `Proposal cover · ${file.name}`,
      category: 'Proposals',
      size: file.size,
      bucket: 'proposal-images',
      path: file.path,
      previewUrl: await signedUrl('proposal-images', file.path),
      canDelete: true,
    });
  }

  for (const file of clientLogos) {
    files.push({
      id: `client-logos:${file.path}`,
      name: `Client logo · ${file.name}`,
      category: 'Clients',
      size: file.size,
      bucket: 'client-logos',
      path: file.path,
      previewUrl: publicUrl('client-logos', file.path),
      canDelete: true,
    });
  }

  for (const file of avatarFiles) {
    files.push({
      id: `avatars:${file.path}`,
      name: `Profile photo · ${file.name}`,
      category: 'Profile',
      size: file.size,
      bucket: 'avatars',
      path: file.path,
      previewUrl: publicUrl('avatars', file.path),
      canDelete: true,
    });
  }

  for (const row of reviewFilesRes as Array<{
    id: string;
    file_name: string;
    file_size: number | null;
    file_url: string;
    review_requests?: { title: string } | null;
  }>) {
    files.push({
      id: `review:${row.id}`,
      name: row.file_name,
      category: row.review_requests?.title ? `Review · ${row.review_requests.title}` : 'Review file',
      size: Number(row.file_size || 0),
      bucket: 'review-files',
      path: row.file_url,
      previewUrl: row.file_url,
      canDelete: true,
    });
  }

  return files.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function getUserStorageBytesUsed(userId: string): Promise<number> {
  const files = await listUserStorageFiles(userId);
  return files.reduce((sum, file) => sum + file.size, 0);
}

export async function assertStorageCapacity(userId: string, additionalBytes: number): Promise<void> {
  const used = await getUserStorageBytesUsed(userId);
  if (used + additionalBytes > MAX_USER_STORAGE_BYTES) {
    throw new Error('Storage limit reached. Remove files in Settings → Storage to free space.');
  }
}

/** Fast quota check for logo uploads (avoids scanning all buckets — reduces "Failed to fetch" timeouts). */
export async function assertStorageCapacityForLogoUpload(
  userId: string,
  additionalBytes: number,
): Promise<void> {
  try {
    const files = await listFolder('business-logos', userId);
    const used = files.reduce((sum, file) => sum + file.size, 0);
    if (used + additionalBytes > MAX_USER_STORAGE_BYTES) {
      throw new Error('Storage limit reached. Remove files in Settings → Storage to free space.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Storage limit')) throw err;
    console.warn('Storage pre-check skipped:', err);
  }
}

export function storagePathFromPublicUrl(bucket: string, publicUrl: string): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;
  const marker = `/object/public/${bucket}/`;
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) {
    return decodeURIComponent(trimmed.slice(idx + marker.length).split('?')[0] || '');
  }
  const altMarker = `${bucket}/`;
  const altIdx = trimmed.indexOf(altMarker);
  if (altIdx >= 0) {
    return decodeURIComponent(trimmed.slice(altIdx + altMarker.length).split('?')[0] || '');
  }
  return null;
}

/** Direct Storage REST upload — avoids supabase-js client dropping the POST after CORS preflight. */
export async function uploadBusinessLogoFile(
  userId: string,
  file: File,
  pathPrefix = 'logo',
): Promise<{ publicUrl: string; path: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  if (!supabaseUrl) {
    throw new Error('Supabase URL is missing. Set VITE_SUPABASE_URL in your .env file.');
  }

  const apikey = supabaseAnonKey?.trim();
  if (!apikey) {
    throw new Error('Supabase API key is missing. Set VITE_SUPABASE_ANON_KEY in your .env file.');
  }
  if (apikey.startsWith('sb_publishable_') && !import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    throw new Error(
      'Logo uploads need the legacy anon key (JWT). In Supabase → Project Settings → API, copy the anon public key into VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.',
    );
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Your session may have expired. Sign out and sign back in, then try again.');
  }

  const ext = file.name.split('.').pop() || 'png';
  const path = `${userId}/${pathPrefix}-${Date.now()}.${ext}`;
  const contentType = file.type || 'image/png';
  const uploadUrl = `${supabaseUrl}/storage/v1/object/business-logos/${path}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = (await res.json()) as { message?: string; error?: string };
      detail = json.message || json.error || detail;
    } catch {
      /* ignore parse errors */
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('Storage access was denied. Sign out and sign back in, then try again.');
    }
    throw new Error(detail || `Upload failed (${res.status})`);
  }

  const { data } = supabase.storage.from('business-logos').getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export function formatUploadError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (/legacy anon key|VITE_SUPABASE_ANON_KEY/i.test(msg)) {
    return msg;
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'The upload did not reach the server. Add VITE_SUPABASE_ANON_KEY (JWT anon key) to .env, restart npm run dev, then try again. Also check connection, use PNG/JPG under 500 KB, and disable VPN or ad blockers.';
  }
  if (msg.includes('row-level security') || msg.includes('violates')) {
    return 'Storage access was denied. Ensure the business-logos bucket allows uploads for your account.';
  }
  if (msg.includes('Bucket not found')) {
    return 'Create a storage bucket named "business-logos" in Supabase Storage and set it to public.';
  }
  return msg || 'Unknown error';
}
