import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Crown } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SubscriptionProfile {
  plan_type: string | null;
  subscription_status: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  stripe_customer_id: string | null;
}

const STRIPE_PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY as string | undefined;
const STRIPE_PRICE_ANNUAL = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as string | undefined;

const plans = [
  {
    id: 'pro_monthly',
    name: 'Early Access Monthly',
    price: '$29',
    period: '/month',
    priceId: STRIPE_PRICE_MONTHLY,
    description: 'Full access. 15-day free trial.',
    features: [
      'Unlimited projects & clients',
      'Time tracking & invoicing',
      'Client reviews & approvals',
      'Cancel anytime',
    ],
  },
  {
    id: 'pro_annual',
    name: 'Early Access Annual',
    price: '$290',
    period: '/year',
    priceId: STRIPE_PRICE_ANNUAL,
    description: '2 months free. 15-day free trial.',
    features: [
      'Everything in Monthly',
      'Billed annually',
      'Early access to new features',
      'Best value',
    ],
    highlighted: true,
  },
];

export default function SubscriptionSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<SubscriptionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_type, subscription_status, trial_start_date, trial_end_date, stripe_customer_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    const priceId = plan?.priceId;
    if (!priceId) {
      toast({
        title: 'Stripe not configured',
        description: 'Set VITE_STRIPE_PRICE_MONTHLY and VITE_STRIPE_PRICE_ANNUAL in your .env',
        variant: 'destructive',
      });
      return;
    }
    setUpgrading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session?.access_token) {
        toast({ title: 'Please sign in again', description: 'Your session may have expired.', variant: 'destructive' });
        setUpgrading(false);
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !anonKey) {
        toast({ title: 'App config error', description: 'Missing Supabase URL or key', variant: 'destructive' });
        setUpgrading(false);
        return;
      }
      const url = `${supabaseUrl}/functions/v1/create-checkout-session`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || res.statusText || `Checkout failed (${res.status})`;
        toast({ title: 'Error starting checkout', description: String(msg), variant: 'destructive' });
        setUpgrading(false);
        return;
      }
      const checkoutUrl = data?.url ?? data?.data?.url;
      if (checkoutUrl && typeof checkoutUrl === 'string') {
        window.location.href = checkoutUrl;
        return;
      }
      toast({ title: 'Error starting checkout', description: data?.error ?? 'No checkout URL returned', variant: 'destructive' });
    } catch (error: unknown) {
      toast({
        title: 'Error starting checkout',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session?.access_token) {
        toast({ title: 'Please sign in again', description: 'Your session may have expired.', variant: 'destructive' });
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !anonKey) {
        toast({ title: 'App config error', variant: 'destructive' });
        return;
      }
      const url = `${supabaseUrl}/functions/v1/create-portal-session`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || res.statusText || `Portal failed (${res.status})`;
        toast({ title: 'Error opening billing portal', description: String(msg), variant: 'destructive' });
        return;
      }
      const portalUrl = data?.url;
      if (portalUrl && typeof portalUrl === 'string') {
        window.location.href = portalUrl;
        return;
      }
      toast({ title: 'Error', description: data?.error ?? 'No portal URL returned', variant: 'destructive' });
    } catch (error: unknown) {
      toast({
        title: 'Error opening billing portal',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const trialEndDate = profile?.trial_end_date ? new Date(profile.trial_end_date) : null;
  const isOnTrial = profile?.subscription_status === 'trial' && !!trialEndDate && trialEndDate >= new Date();
  const hadTrialExpired = profile?.subscription_status === 'trial' && !!trialEndDate && trialEndDate < new Date();
  const isPastDue = profile?.subscription_status === 'past_due';
  const isActive = profile?.subscription_status === 'active';
  const daysLeft = profile?.trial_end_date 
    ? Math.max(0, differenceInDays(new Date(profile.trial_end_date), new Date()))
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {isActive && <Crown className="h-4 w-4 text-primary" />}
              </CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
            <Badge 
              variant={isOnTrial ? 'secondary' : isPastDue ? 'destructive' : 'default'}
              className={isActive ? 'bg-primary' : ''}
            >
              {isOnTrial ? 'Free Trial' : isActive ? 'Active' : isPastDue ? 'Past Due' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isOnTrial && (
            <div 
              className="rounded-lg p-4 mb-4"
              style={{
                background: 'linear-gradient(135deg, hsl(262, 40%, 97%) 0%, hsl(218, 55%, 91%) 100%)',
              }}
            >
              <div className="flex items-center gap-3">
                <SlotIcon slot="settings_subscription" className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">
                    You're on the <strong>{profile?.plan_type === 'pro_annual' ? 'Early Access Annual' : 'Early Access Monthly'}</strong> plan (15-day free trial).
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {daysLeft === 0 
                      ? "Your trial ends today." 
                      : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial`
                    }
                    {profile?.trial_end_date && (
                      <> · Trial ends {format(new Date(profile.trial_end_date), 'MMMM d, yyyy')}</>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your card will be charged automatically when your trial ends—no action needed. You can update payment or cancel anytime in the billing portal below.
                  </p>
                </div>
              </div>
            </div>
          )}
          {isActive && (
            <div className="space-y-2">
              <p className="font-medium">
                You're on the <strong>{profile?.plan_type === 'pro_monthly' ? 'Early Access Monthly' : 'Early Access Annual'}</strong> plan.
              </p>
              <p className="text-sm text-muted-foreground">
                Your subscription is active. Thank you for being a member!
              </p>
            </div>
          )}
          {(hadTrialExpired || isPastDue) && (
            <div className="space-y-2">
              <p className="font-medium">
                {isPastDue
                  ? "We couldn't charge your card for your subscription."
                  : "Your free trial has ended."}
              </p>
              <p className="text-sm text-muted-foreground">
                Update your payment method or subscribe to a plan below to restore full access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans – always visible; show which one the user is on and allow switch / subscribe */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Plans</h3>
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 md:items-start">
          {plans.map((plan) => {
            const isCurrentPlan = (isActive || isOnTrial) && profile?.plan_type === plan.id;
            const hasBillingAccount = !!profile?.stripe_customer_id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  'flex flex-col border-border',
                  isCurrentPlan ? 'border-primary shadow-lg ring-1 ring-primary/30' : '',
                  plan.highlighted && !isCurrentPlan ? 'border-primary shadow-lg' : ''
                )}
              >
                <CardHeader>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {plan.highlighted ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          Most popular
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-transparent">
                          Most popular
                        </span>
                      )}
                    </p>
                    {isCurrentPlan ? (
                      <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                        Your plan
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-primary">{plan.name}</h4>
                  <p className="mt-2 text-3xl font-bold">
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      {plan.period}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.id === 'pro_monthly' ? 'Billed monthly' : 'Billed yearly'}
                  </p>
                  <CardDescription className="mt-4 text-sm text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardContent>
                  {isCurrentPlan ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={!hasBillingAccount && !isOnTrial && !isActive}
                    >
                      Manage plan
                    </Button>
                  ) : (isOnTrial || isActive || isPastDue) ? (
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={isPastDue ? () => handleUpgrade(plan.id) : handleManageSubscription}
                    >
                      {isPastDue ? 'Update and subscribe' : 'Change plan'}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading || !plan.priceId}
                    >
                      {upgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Subscribe now
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Manage Subscription – standard for SaaS: link to Stripe Customer Portal (cancel, update payment, invoices) */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Manage billing</CardTitle>
          <CardDescription>
            Update payment method, view invoices, or cancel in Stripe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(profile?.stripe_customer_id || isOnTrial || isActive || isPastDue) ? (
            <>
              <Button variant="outline" onClick={handleManageSubscription}>
                Open billing portal
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Subscribe to a plan above and complete checkout. After that, you can manage or cancel your subscription here.
              </p>
              <Button variant="outline" disabled>
                Open billing portal
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground text-center">
        <Link to="/terms" className="text-primary hover:underline">Terms and conditions</Link>
        {' · '}
        <Link to="/privacy" className="text-primary hover:underline">Privacy policy</Link>
      </p>
    </div>
  );
}