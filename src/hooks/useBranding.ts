import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AppBranding = Database['public']['Tables']['app_branding']['Row'];

const BRANDING_KEY = ['app_branding'] as const;

export function useBranding() {
  return useQuery({
    queryKey: BRANDING_KEY,
    queryFn: async (): Promise<AppBranding | null> => {
      const { data, error } = await supabase
        .from('app_branding')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrandingMutation() {
  const queryClient = useQueryClient();
  return {
    invalidate: () => queryClient.invalidateQueries({ queryKey: BRANDING_KEY }),
  };
}
