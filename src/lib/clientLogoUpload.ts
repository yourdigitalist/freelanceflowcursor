import { supabase } from '@/integrations/supabase/client';
import { assertStorageCapacity } from '@/lib/userStorage';

/** Resolve logo_url for insert/update: keep, replace, or clear based on preview + file input. */
export async function resolveClientLogoPath(params: {
  userId: string;
  clientId: string;
  existingLogoPath: string | null;
  logoFile?: File | null;
  hasPreview: boolean;
}): Promise<string | null> {
  let logoPath = params.existingLogoPath;
  if (!params.logoFile && !params.hasPreview) {
    logoPath = null;
  }
  if (params.logoFile) {
    await assertStorageCapacity(params.userId, params.logoFile.size);
    const ext = params.logoFile.name.split('.').pop() || 'png';
    const path = `${params.userId}/client-${params.clientId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('client-logos')
      .upload(path, params.logoFile, { upsert: true });
    if (uploadError) throw uploadError;
    logoPath = path;
  }
  return logoPath;
}
