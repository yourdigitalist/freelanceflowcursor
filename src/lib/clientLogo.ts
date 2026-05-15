import { supabase } from '@/integrations/supabase/client';

export function clientLogoPublicUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl;
  const { data } = supabase.storage.from('client-logos').getPublicUrl(logoUrl);
  return data.publicUrl;
}
