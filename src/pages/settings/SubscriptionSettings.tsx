import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Sparkles, Crown, RotateCcw } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [resetting, setResetting] = useState(false);

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
    if (!profile?.stripe_customer_id) {
      toast({
        title: 'No billing account',
        description: 'Choose a plan above to add a payment method, then you can manage it here.',
        variant: 'destructive',
      });
      return;
    }
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

  const handleResetToTrial = async () => {
    if (!user?.id) return;
    setResetting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'trial',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          plan_type: null,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Reset to trial', description: 'You can try upgrading again.' });
      await fetchProfile();
    } catch (e: unknown) {
      toast({
        title: 'Reset failed',
        description: e instanceof Error ? e.message : 'Could not reset',
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOnTrial = profile?.subscription_status === 'trial';
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
              variant={isOnTrial ? 'secondary' : 'default'}
              className={isActive ? 'bg-primary' : ''}
            >
              {isOnTrial ? 'Free Trial' : isActive ? 'Active' : 'Inactive'}
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
                <Sparkles className="h-5 w-5 text-primary" />
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
                </div>
              </div>
            </div>
          )}
          
          {isOnTrial && !profile?.stripe_customer_id && (
            <p className="text-sm text-muted-foreground">
              Pick a plan below to add a payment method and continue after your trial.
            </p>
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
          <div className="mt-4 pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={resetting}>
                  {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                  Reset to trial (for testing)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to trial?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears your billing link so you can go through the upgrade flow again. Use only for testing. Your Stripe subscription is not changed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToTrial}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Plans – always visible; show which one the user is on and allow switch / subscribe */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Plans</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = (isActive || isOnTrial) && profile?.plan_type === plan.id;
            const hasBillingAccount = !!profile?.stripe_customer_id;
            return (
              <Card
                key={plan.id}
                className={`border-2 ${isCurrentPlan ? 'border-primary' : plan.highlighted && !isCurrentPlan ? 'border-primary/50' : 'border-transparent'}`}
              >
                {plan.highlighted && !isCurrentPlan && (
                  <div className="bg-primary text-primary-foreground text-xs font-medium text-center py-1">
                    Best Value
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="bg-primary text-primary-foreground text-xs font-medium text-center py-1">
                    Your plan
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isCurrentPlan ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={!hasBillingAccount}
                    >
                      Manage plan
                    </Button>
                  ) : hasBillingAccount ? (
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={handleManageSubscription}
                    >
                      Switch to this plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading || !plan.priceId}
                    >
                      {upgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Start 15-day free trial
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
          {profile?.stripe_customer_id ? (
            <>
              <p className="text-sm text-muted-foreground">
                Open the Stripe billing portal to update your payment method, download invoices, or cancel your subscription.
              </p>
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
    </div>
  );
}