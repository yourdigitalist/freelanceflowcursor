import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LandingContent } from '@/lib/landingContent';
import { mergeLandingContent } from '@/lib/landingContent';

const LANDING_CONTENT_KEY = ['landing_content'] as const;

export function useLandingContent() {
  return useQuery({
    queryKey: LANDING_CONTENT_KEY,
    queryFn: async (): Promise<LandingContent> => {
      const { data, error } = await supabase
        .from('landing_content')
        .select('content')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      const raw = data?.content as Partial<LandingContent> | null;
      return mergeLandingContent(raw ?? null);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useLandingContentMutation() {
  const queryClient = useQueryClient();
  return {
    invalidate: () => queryClient.invalidateQueries({ queryKey: LANDING_CONTENT_KEY }),
  };
}
