export type BillingProfile = {
  is_lifetime?: boolean | null;
  subscription_status?: string | null;
  trial_end_date?: string | null;
};

/** Whether the user can access the app outside billing settings. */
export function hasBillingAccess(profile: BillingProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_lifetime === true) return true;

  const status = (profile.subscription_status ?? '').toLowerCase();
  const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
  const now = new Date();

  if (status === 'active') return true;
  if (status === 'trial' && trialEnd && trialEnd >= now) return true;
  return false;
}
