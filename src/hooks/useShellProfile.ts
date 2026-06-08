import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ShellProfile = {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  trial_end_date: string | null;
  is_lifetime: boolean | null;
  is_admin: boolean | null;
};

const SHELL_PROFILE_KEY = ['shell_profile'] as const;

export function useShellProfile(userId: string | undefined) {
  return useQuery({
    queryKey: [...SHELL_PROFILE_KEY, userId],
    queryFn: async (): Promise<ShellProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'first_name, last_name, full_name, email, avatar_url, subscription_status, plan_type, trial_end_date, is_lifetime, is_admin',
        )
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function shellProfileDisplayName(profile: ShellProfile | null | undefined): string | null {
  if (!profile) return null;
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`.trim();
  }
  return profile.full_name?.trim() || null;
}
