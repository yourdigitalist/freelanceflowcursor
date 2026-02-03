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
}

const plans = [
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: '$45',
    period: '/month',
    description: 'Full access to all features',
    features: [
      'Unlimited projects & clients',
      'Advanced time tracking',
      'Professional invoices',
      'Priority support',
    ],
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: '$360',
    period: '/year',
    description: 'Save $180 annually',
    features: [
      'Everything in Pro Monthly',
      '2 months free',
      'Early access to new features',
      'Dedicated support',
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
        .select('plan_type, subscription_status, trial_start_date, trial_end_date')
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
    setUpgrading(true);
    try {
      // In a real app, this would integrate with Stripe or another payment provider
      const { error } = await supabase
        .from('profiles')
        .update({
          plan_type: planId,
          subscription_status: 'active',
        })
        .eq('user_id', user!.id);

      if (error) throw error;
      toast({ title: 'Plan upgraded successfully!' });
      fetchProfile();
    } catch (error: any) {
      toast({
        title: 'Error upgrading plan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpgrading(false);
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
          
          {isActive && (
            <div className="space-y-2">
              <p className="font-medium">
                {profile?.plan_type === 'pro_monthly' ? 'Pro Monthly' : 'Pro Annual'}
              </p>
              <p className="text-sm text-muted-foreground">
                Your subscription is active. Thank you for being a Pro member!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {(isOnTrial || !isActive) && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Upgrade to Pro</h3>
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
                    disabled={upgrading}
                  >
                    {upgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Manage Subscription */}
      {isActive && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>Update your payment method or cancel</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline">Update Payment Method</Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}