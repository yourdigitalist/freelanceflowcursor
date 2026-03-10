import { supabase } from '@/integrations/supabase/client';

export const APP_ICONS_BUCKET = 'app-icons';
const LIST_PAGE_SIZE = 500;

/** List all SVG paths in the app-icons bucket (root, uploads, icons folders) */
export async function listAllIconPaths(): Promise<string[]> {
  const paths: string[] = [];
  const listFolder = async (folder: string): Promise<void> => {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase.storage
        .from(APP_ICONS_BUCKET)
        .list(folder || undefined, { limit: LIST_PAGE_SIZE, offset });
      if (error) {
        if (error.message?.includes('not found') || error.message?.includes('Listing')) return;
        throw error;
      }
      const items = data ?? [];
      for (const item of items) {
        const name = item.name;
        if (name.toLowerCase().endsWith('.svg')) {
          paths.push(folder ? `${folder}/${name}` : name);
        }
      }
      hasMore = items.length === LIST_PAGE_SIZE;
      offset += items.length;
    }
  };
  await listFolder('');
  await listFolder('uploads');
  await listFolder('icons');
  return paths.sort((a, b) => a.localeCompare(b));
}

export function getAppIconPublicUrl(path: string): string {
  if (!path) return '';
  const { data } = supabase.storage.from(APP_ICONS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function displayNameForIconPath(path: string): string {
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.svg$/i, '').replace(/[-_]/g, ' ');
}
