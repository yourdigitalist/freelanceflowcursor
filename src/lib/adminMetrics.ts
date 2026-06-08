export const ADMIN_MONTHLY_PRICE = 29;
export const ADMIN_ANNUAL_PRICE = 290;

export type AdminMetricsSummary = {
  total_signups: number;
  signups_this_week: number;
  signups_this_month: number;
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
};

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
};

export type AdminUserFilter =
  | 'all'
  | 'trial'
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'expiring_7d'
  | 'ghosted';

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

export function isGhostedUser(lastSignIn: string | null, days = 30): boolean {
  if (!lastSignIn) return true;
  const last = new Date(lastSignIn).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last > days * 24 * 60 * 60 * 1000;
}

export function isTrialExpiringSoon(trialEnd: string | null, withinDays = 7): boolean {
  if (!trialEnd) return false;
  const end = new Date(trialEnd).getTime();
  if (Number.isNaN(end)) return false;
  const now = Date.now();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;
  return end >= now && end <= limit;
}
