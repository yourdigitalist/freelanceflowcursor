import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { resolveAppFeatures, type AppFeatureFlags } from '@/lib/features';

export type AppFeaturesRow = Database['public']['Tables']['app_features']['Row'];

const APP_FEATURES_KEY = ['app_features'] as const;

export function useAppFeatures() {
  return useQuery({
    queryKey: APP_FEATURES_KEY,
    queryFn: async (): Promise<AppFeatureFlags> => {
      const { data, error } = await supabase
        .from('app_features')
        .select('notes_access_mode, contracts_access_mode, proposals2_access_mode')
        .eq('id', 1)
        .maybeSingle();
      if (error) {
        // Graceful fallback until migration is applied
        return resolveAppFeatures(null);
      }
      return resolveAppFeatures(data);
    },
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useAppFeaturesMutation() {
  const queryClient = useQueryClient();
  return {
    invalidate: () => queryClient.invalidateQueries({ queryKey: APP_FEATURES_KEY }),
  };
}
