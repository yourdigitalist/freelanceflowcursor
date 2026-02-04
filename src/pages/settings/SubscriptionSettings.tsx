import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Sparkles, Crown } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: 'Please sign in again', variant: 'destructive' });
        setUpgrading(false);
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: 'Please sign in again', variant: 'destructive' });
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
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
                    {daysLeft === 0 
                      ? "Your trial ends today!" 
                      : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining in your trial`
                    }
                  </p>
                  {profile?.trial_end_date && (
                    <p className="text-sm text-muted-foreground">
                      Trial expires on {format(new Date(profile.trial_end_date), 'MMMM d, yyyy')}
                    </p>
                  )}
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
                {profile?.plan_type === 'pro_monthly' ? 'Early Access Monthly' : 'Early Access Annual'}
              </p>
              <p className="text-sm text-muted-foreground">
                Your subscription is active. Thank you for being a member!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options - show when on trial or not active */}
      {(isOnTrial || !isActive) && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Subscribe</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`border-2 ${plan.highlighted ? 'border-primary' : 'border-transparent'}`}
              >
                {plan.highlighted && (
                  <div className="bg-primary text-primary-foreground text-xs font-medium text-center py-1">
                    Best Value
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
                  <Button 
                    className="w-full" 
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading || !plan.priceId}
                  >
                    {upgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Start 15-day free trial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Manage Subscription - only when we have a Stripe customer (e.g. after checkout) */}
      {(isActive || (isOnTrial && profile?.stripe_customer_id)) && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>Update your payment method or cancel</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Update your payment method, view invoices, or cancel your subscription in the Stripe portal.
            </p>
            {profile?.stripe_customer_id ? (
              <Button variant="outline" onClick={handleManageSubscription}>
                Open billing portal
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a plan above to add a payment method; then you can manage it here.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}