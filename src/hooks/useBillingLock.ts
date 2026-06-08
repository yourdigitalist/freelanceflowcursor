import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isBillingLocked, type BillingLockProfile } from '@/lib/billingAccess';

const BILLING_LOCK_KEY = ['billing_lock'] as const;

async function fetchBillingLockProfile(userId: string): Promise<BillingLockProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed, subscription_status, trial_end_date, is_lifetime')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useBillingLock(userId: string | undefined) {
  const query = useQuery({
    queryKey: [...BILLING_LOCK_KEY, userId],
    queryFn: () => fetchBillingLockProfile(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const profile = query.data;
  return {
    profile,
    isBillingLocked: isBillingLocked(profile),
    isPending: query.isPending,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}
