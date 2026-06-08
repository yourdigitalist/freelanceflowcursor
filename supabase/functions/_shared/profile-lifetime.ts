/** Fields safe to sync from Stripe for lifetime (grandfathered) users. */
export const LIFETIME_STRIPE_SYNC_FIELDS = [
  "onboarding_completed",
  "plan_type",
  "stripe_customer_id",
  "stripe_subscription_id",
  "trial_start_date",
  "trial_end_date",
  "stripe_promotion_code",
] as const;

export function stripeProfileUpdateForLifetimeUser(
  isLifetime: boolean,
  update: Record<string, unknown>,
): Record<string, unknown> {
  if (!isLifetime) return update;

  const filtered: Record<string, unknown> = {};
  for (const key of LIFETIME_STRIPE_SYNC_FIELDS) {
    if (key in update && update[key] !== undefined) {
      filtered[key] = update[key];
    }
  }
  return filtered;
}
