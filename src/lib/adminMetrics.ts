export const ADMIN_MONTHLY_PRICE = 29;
export const ADMIN_ANNUAL_PRICE = 290;

export type AdminMetricsSummary = {
  total_signups: number;
  signups_this_week: number;
  signups_this_month: number;
  unconfirmed_signups: number;
  unconfirmed_signups_this_week: number;
  unconfirmed_signups_this_month: number;
  trial_users: number;
  paying_users: number;
  past_due_users: number;
  canceled_users: number;
  monthly_subscribers: number;
  annual_subscribers: number;
  mrr: number;
  arr: number;
  new_paid_this_month: number;
  new_mrr_this_month: number;
  churned_this_month: number;
  active_trials: number;
  trials_expiring_7d: number;
  trial_to_paid_conversion_rate: number;
  ever_trialed: number;
  converted_active: number;
  beta_testers: number;
};

export const BETA_PROMOTION_CODES = ['betatesters', 'mgtest', 'mgtest2'] as const;

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  trial_end_date: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
  last_sign_in_at: string | null;
  stripe_promotion_code: string | null;
  email_confirmed: boolean;
  email_confirmed_at: string | null;
  confirmation_sent_at: string | null;
};

export type AdminUserListTab = 'all' | 'coupons' | 'trials';

export type AdminCouponFilter = 'all' | (typeof BETA_PROMOTION_CODES)[number];

export const ADMIN_COUPON_FILTER_OPTIONS: { value: AdminCouponFilter; label: string }[] = [
  { value: 'all', label: 'All coupons' },
  { value: 'betatesters', label: 'BETATESTERS' },
  { value: 'mgtest', label: 'MGTEST' },
  { value: 'mgtest2', label: 'MGTEST2' },
];

export type AdminUserFilter =
  | 'all'
  | 'trial'
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'expiring_7d'
  | 'ghosted'
  | 'unconfirmed';

export function formatAdminMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAdminPlan(planType: string | null): string {
  if (!planType) return '—';
  switch (planType.toLowerCase()) {
    case 'pro_monthly':
      return 'Monthly';
    case 'pro_annual':
      return 'Annual';
    case 'free_trial':
      return 'Free trial';
    default:
      return planType.replace(/_/g, ' ');
  }
}

/** Admin accounts hidden from the metrics user tables (not from aggregate RPC counts). */
export function normalizePromotionCode(code: string | null | undefined): string {
  return (code ?? '').trim().toLowerCase();
}

export function hasBetaPromotionCode(row: AdminUserRow): boolean {
  const code = normalizePromotionCode(row.stripe_promotion_code);
  return BETA_PROMOTION_CODES.includes(code as (typeof BETA_PROMOTION_CODES)[number]);
}

export function isPayingSubscriber(row: AdminUserRow): boolean {
  return (row.subscription_status ?? '').toLowerCase() === 'active';
}

/** Users on a tracked comp promotion code (includes comped active subs). */
export function isCouponUser(row: AdminUserRow): boolean {
  return hasBetaPromotionCode(row);
}

export function isTrialUser(row: AdminUserRow): boolean {
  return (row.subscription_status ?? '').toLowerCase() === 'trial';
}

/** Signed up but no tracked coupon yet (usually still in trial / pre-checkout). */
export function isOrganicUser(row: AdminUserRow): boolean {
  return !isCouponUser(row);
}

/** @deprecated Use isCouponUser */
export function isBetaTester(row: AdminUserRow): boolean {
  return isCouponUser(row);
}

export function matchesCouponFilter(row: AdminUserRow, filter: AdminCouponFilter): boolean {
  if (!isCouponUser(row)) return false;
  if (filter === 'all') return true;
  return normalizePromotionCode(row.stripe_promotion_code) === filter;
}

export function formatPromotionCodeTag(code: string | null | undefined): string {
  const trimmed = (code ?? '').trim();
  return trimmed ? trimmed.toUpperCase() : '';
}

export function isAdminMetricsExcludedUser(row: AdminUserRow): boolean {
  const name = (row.full_name ?? '').trim().toLowerCase();
  return name === 'marina gurgel';
}

export function isGhostedUser(lastSignIn: string | null, days = 30): boolean {
  if (!lastSignIn) return true;
  const last = new Date(lastSignIn).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last > days * 24 * 60 * 60 * 1000;
}

export function isUnconfirmedUser(row: AdminUserRow): boolean {
  return row.email_confirmed === false;
}

export function isTrialExpiringSoon(trialEnd: string | null, withinDays = 7): boolean {
  if (!trialEnd) return false;
  const end = new Date(trialEnd).getTime();
  if (Number.isNaN(end)) return false;
  const now = Date.now();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;
  return end >= now && end <= limit;
}
