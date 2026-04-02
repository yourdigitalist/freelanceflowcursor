import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronDown } from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/AppLogo';
import {
  Check,
  Loader2,
  ArrowRight,
  LogOut,
} from '@/components/icons';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  MessageSquare,
  Bell,
  Receipt,
  Timer,
} from 'lucide-react';
import { currencies } from '@/lib/locale-data';
import { cn } from '@/lib/utils';

const STRIPE_PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY as string | undefined;
const STRIPE_PRICE_ANNUAL = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as string | undefined;

const ONBOARDING_STEP_KEY = 'onboarding_step';

type Step = 'role' | 'useFirst' | 'optional' | 'plan';

const roles = [
  { id: 'freelancer', label: 'Freelancer' },
  { id: 'consultant', label: 'Consultant' },
  { id: 'designer', label: 'Designer' },
  { id: 'developer', label: 'Developer or engineer' },
  { id: 'agency', label: 'Agency' },
  { id: 'coach', label: 'Coach or trainer' },
  { id: 'photographer', label: 'Photographer or videographer' },
  { id: 'other', label: 'Other' },
];

/** Matches main app navigation (sidebar) so icons and labels stay consistent. */
const useFirstOptions = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'time', label: 'Time tracking', icon: Timer },
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'reviews', label: 'Client approvals', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

async function getAccessTokenWithRetry(maxAttempts = 6): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) {
      return sessionData.session.access_token;
    }
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
    await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
  }
  return null;
}

/** Display amounts for savings copy (keep in sync with Stripe prices). */
const PLAN_MONTHLY_AMOUNT = 29;
const PLAN_ANNUAL_AMOUNT = 290;

const planBenefits = [
  'Clients, projects & time tracking',
  'Invoicing, estimates & PDFs',
  'Client approvals & review requests',
  'Notes, notifications & dashboard',
  'Email support',
] as const;

const plans = [
  {
    id: 'pro_monthly',
    name: 'Monthly',
    price: '$29',
    period: '/month',
    priceId: STRIPE_PRICE_MONTHLY,
    subtitle: 'Pay month to month. Full access after trial.',
  },
  {
    id: 'pro_annual',
    name: 'Annual',
    price: '$290',
    period: '/year',
    priceId: STRIPE_PRICE_ANNUAL,
    subtitle: 'Best for committed freelancers—2 months free vs monthly.',
    highlighted: true,
  },
];

const monthlyIfPaidMonthly = PLAN_MONTHLY_AMOUNT * 12;
const annualSaveVsMonthly = monthlyIfPaidMonthly - PLAN_ANNUAL_AMOUNT;
const annualSavePercent =
  monthlyIfPaidMonthly > 0
    ? Math.round((annualSaveVsMonthly / monthlyIfPaidMonthly) * 100)
    : 0;
const annualEffectiveMonthly = (PLAN_ANNUAL_AMOUNT / 12).toFixed(2);

export default function Onboarding() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(() => {
    if (typeof window === 'undefined') return 'role';
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout_success') === '1') {
        const saved = sessionStorage.getItem(ONBOARDING_STEP_KEY);
        if (saved && ['role', 'useFirst', 'optional', 'plan'].includes(saved)) {
          return saved as Step;
        }
      }
    } catch {
      /* ignore */
    }
    return 'role';
  });
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUseFirst, setSelectedUseFirst] = useState<string>('');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('pro_annual');
  const [loading, setLoading] = useState(false);
  const [completingCheckout, setCompletingCheckout] = useState(false);
  const checkoutCompleteAttemptedRef = useRef(false);
  const resendSyncAttemptedRef = useRef(false);

  // Sync this user to Resend (marketing lists) once when they hit onboarding after signup
  useEffect(() => {
    if (!user?.id || resendSyncAttemptedRef.current) return;
    resendSyncAttemptedRef.current = true;
    const syncToResend = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!supabaseUrl || !session?.access_token) return;
      try {
        await fetch(`${supabaseUrl}/functions/v1/sync-users-to-resend`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user.id }),
        });
      } catch {
        // Non-blocking; full sync or cron can backfill
      }
    };
    syncToResend();
  }, [user?.id]);

  // Handle return from Stripe Checkout: ?checkout_success=1&session_id=...
  useEffect(() => {
    const success = searchParams.get('checkout_success');
    const sessionId = searchParams.get('session_id');
    if (success !== '1' || !sessionId || !user || checkoutCompleteAttemptedRef.current) return;

    checkoutCompleteAttemptedRef.current = true;
    setCompletingCheckout(true);

    const clearCheckoutParams = () => {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.delete('checkout_success');
        next.delete('session_id');
        return next;
      });
    };

    (async () => {
      try {
        const accessToken = await getAccessTokenWithRetry();
        if (!accessToken) {
          checkoutCompleteAttemptedRef.current = false;
          toast({
            title: 'Could not restore your session',
            description: 'Refresh this page after signing in again, or open Settings → Subscription to finish setup.',
            variant: 'destructive',
          });
          setCompletingCheckout(false);
          return;
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !anonKey) {
          checkoutCompleteAttemptedRef.current = false;
          toast({ title: 'App config error', variant: 'destructive' });
          setCompletingCheckout(false);
          return;
        }
        const res = await fetch(`${supabaseUrl}/functions/v1/complete-onboarding-after-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: anonKey,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const isAuth = res.status === 401;
          if (isAuth) {
            checkoutCompleteAttemptedRef.current = false;
            toast({
              title: 'Session not ready yet',
              description: 'Refresh the page in a moment, or sign out and back in. Your Stripe payment was still processed.',
              variant: 'destructive',
            });
            setCompletingCheckout(false);
            return;
          }
          clearCheckoutParams();
          toast({
            title: 'Setup incomplete',
            description: typeof data?.error === 'string' ? data.error : 'Please try again from Settings → Subscription.',
            variant: 'destructive',
          });
          setCompletingCheckout(false);
          return;
        }
        clearCheckoutParams();
        navigate('/dashboard', { replace: true });
      } catch {
        checkoutCompleteAttemptedRef.current = false;
        toast({
          title: 'Something went wrong',
          description: 'Refresh the page to retry. If payment went through, use Settings → Subscription.',
          variant: 'destructive',
        });
      } finally {
        setCompletingCheckout(false);
      }
    })();
  }, [searchParams, user, navigate, setSearchParams, toast]);

  const stepsOrder: Step[] = ['role', 'useFirst', 'optional', 'plan'];
  const currentStepIndex = stepsOrder.indexOf(step);

  const handleContinueToPayment = async () => {
    const plan = plans.find((p) => p.id === selectedPlanId);
    const priceId = plan?.priceId;
    if (!priceId) {
      toast({ title: 'Stripe not configured', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await saveOptionalProfile();
      const accessToken = await getAccessTokenWithRetry();
      if (!accessToken) {
        toast({ title: 'Please sign in again', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !anonKey) {
        toast({ title: 'App config error', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/onboarding?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/onboarding`;
      const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ priceId, successUrl, cancelUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data?.error || data?.message || res.statusText || `Checkout failed (${res.status})`;
        toast({ title: 'Error starting checkout', description: String(errMsg), variant: 'destructive' });
        setLoading(false);
        return;
      }
      const url = data?.url ?? data?.data?.url;
      if (url && typeof url === 'string') {
        window.location.href = url;
        return;
      }
      toast({ title: 'No checkout URL returned', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveOptionalProfile = async () => {
    if (!user?.id) return;
    const updates: Record<string, unknown> = {};
    if (businessName.trim()) updates.business_name = businessName.trim();
    if (currency) updates.currency = currency;
    if (Object.keys(updates).length === 0) return;
    await supabase.from('profiles').update(updates).eq('user_id', user.id);
  };

  if (completingCheckout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AppLogo full height={28} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-primary-foreground">
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            {stepsOrder.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === s ? 'bg-primary text-primary-foreground' : i < currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < stepsOrder.length - 1 && <div className="h-px w-6 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {step === 'role' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">What do you do?</h1>
              <p className="text-muted-foreground mt-1">We’ll tailor the experience for you.</p>
            </div>
            <div className="grid gap-3">
              {roles.map((r) => (
                <Card
                  key={r.id}
                  className={`cursor-pointer transition-all border-2 ${selectedRole === r.id ? 'border-primary' : 'border-transparent hover:border-border'}`}
                  onClick={() => setSelectedRole(r.id)}
                >
                  <CardContent className="py-4">{r.label}</CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep('useFirst')} disabled={!selectedRole}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'useFirst' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">What do you want to use first?</h1>
              <p className="text-muted-foreground mt-1">You can use everything—we’ll highlight this.</p>
            </div>
            <div className="grid gap-3">
              {useFirstOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <Card
                    key={opt.id}
                    className={`cursor-pointer transition-all border-2 ${selectedUseFirst === opt.id ? 'border-primary' : 'border-transparent hover:border-border'}`}
                    onClick={() => setSelectedUseFirst(opt.id)}
                  >
                    <CardContent className="py-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden />
                      </span>
                      <span className="font-medium text-foreground">{opt.label}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('role')}>Back</Button>
              <Button onClick={() => setStep('optional')} disabled={!selectedUseFirst}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'optional' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Your business</h1>
              <p className="text-muted-foreground mt-1">Set your business name and currency here. You can add more details later in Settings.</p>
            </div>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        <span>{currencies.find((c) => c.value === currency)?.label?.split(' - ')[0] || currency}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search currency..." />
                        <CommandList>
                          <CommandEmpty>No currency found.</CommandEmpty>
                          {currencies.slice(0, 80).map((c) => (
                            <CommandItem
                              key={c.value}
                              value={`${c.value} ${c.label}`}
                              onSelect={() => {
                                setCurrency(c.value);
                                setCurrencyOpen(false);
                              }}
                            >
                              {c.label}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('useFirst')}>Back</Button>
              <Button onClick={() => setStep('plan')} disabled={!businessName.trim()}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'plan' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
              <p className="text-muted-foreground text-base max-w-lg mx-auto">
                Start with a 15-day free trial. You won’t be charged today—cancel anytime before the trial ends.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/8 to-primary/5 px-5 py-4 text-center shadow-sm">
              <p className="font-semibold text-foreground">No charge today</p>
              <p className="text-muted-foreground text-sm mt-1">
                Full access during your trial. We’ll email you before the trial ends.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 md:items-stretch">
              {plans.map((p) => {
                const selected = selectedPlanId === p.id;
                const hasPrice = Boolean(p.priceId);
                return (
                  <Card
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPlanId(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPlanId(p.id);
                      }
                    }}
                    className={cn(
                      'cursor-pointer transition-all rounded-2xl border-2 shadow-sm hover:shadow-md flex flex-col overflow-hidden',
                      selected ? 'border-primary ring-2 ring-primary/25' : 'border-border/80 hover:border-border',
                      p.highlighted && 'md:scale-[1.02] md:z-10'
                    )}
                  >
                    {p.highlighted && (
                      <div className="bg-primary text-primary-foreground text-xs font-semibold tracking-wide text-center py-2 px-3">
                        POPULAR — 2 months free on annual
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-6 px-6">
                      <CardTitle className="text-lg font-semibold">{p.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-normal leading-snug">{p.subtitle}</p>
                      <div className="pt-4 flex flex-wrap items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                        <span className="text-muted-foreground text-lg">{p.period}</span>
                      </div>
                      {p.highlighted && (
                        <p className="text-sm text-primary font-medium pt-2">
                          ~${annualEffectiveMonthly}/mo billed annually · Save {annualSavePercent}% vs ${PLAN_MONTHLY_AMOUNT}/mo × 12
                          {' '}(save ${annualSaveVsMonthly}/yr)
                        </p>
                      )}
                      {!p.highlighted && (
                        <p className="text-sm text-muted-foreground pt-2">${PLAN_MONTHLY_AMOUNT}/mo × 12 = ${monthlyIfPaidMonthly}/yr if paid monthly all year.</p>
                      )}
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Everything included
                      </p>
                      <ul className="space-y-2.5 flex-1">
                        {planBenefits.map((line) => (
                          <li key={line} className="flex gap-2.5 text-sm text-foreground">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                      {!hasPrice && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-4 rounded-md bg-amber-500/10 px-2 py-1.5">
                          Stripe price ID missing in env—add VITE_STRIPE_PRICE_{p.id === 'pro_monthly' ? 'MONTHLY' : 'ANNUAL'} for checkout.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" onClick={() => setStep('optional')}>Back</Button>
              <Button onClick={handleContinueToPayment} disabled={loading} size="lg" className="min-w-[200px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue to payment
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
