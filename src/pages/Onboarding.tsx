import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBrowserCountry } from '@/lib/locale-data';
import { countries as countryList } from '@/components/ui/phone-input';
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
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Sparkles, Loader2, ArrowRight, Building2, User, FileText, FolderKanban, Timer, LogOut } from 'lucide-react';
import { currencies } from '@/lib/locale-data';

const STRIPE_PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY as string | undefined;
const STRIPE_PRICE_ANNUAL = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as string | undefined;

type Step = 'role' | 'useFirst' | 'optional' | 'plan';

const roles = [
  { id: 'freelancer', label: 'Freelancer' },
  { id: 'consultant', label: 'Consultant' },
  { id: 'designer', label: 'Designer' },
];

const useFirstOptions = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'time', label: 'Time tracking', icon: Timer },
];

const plans = [
  {
    id: 'pro_monthly',
    name: 'Monthly',
    price: '$29',
    period: '/month',
    priceId: STRIPE_PRICE_MONTHLY,
    description: 'Full access. 15-day free trial.',
  },
  {
    id: 'pro_annual',
    name: 'Annual',
    price: '$290',
    period: '/year',
    priceId: STRIPE_PRICE_ANNUAL,
    description: '2 months free. 15-day free trial.',
    highlighted: true,
  },
];

export default function Onboarding() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUseFirst, setSelectedUseFirst] = useState<string>('');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selectedPlanId, setSelectedPlanId] = useState('pro_annual');
  const [loading, setLoading] = useState(false);
  const [completingCheckout, setCompletingCheckout] = useState(false);

  // Handle return from Stripe Checkout: ?checkout_success=1&session_id=...
  useEffect(() => {
    const success = searchParams.get('checkout_success');
    const sessionId = searchParams.get('session_id');
    if (success === '1' && sessionId && user && !completingCheckout) {
      setCompletingCheckout(true);
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.refreshSession();
          if (!session?.access_token) {
            toast({ title: 'Please sign in again', variant: 'destructive' });
            setCompletingCheckout(false);
            return;
          }
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl || !anonKey) {
            toast({ title: 'App config error', variant: 'destructive' });
            setCompletingCheckout(false);
            return;
          }
          const res = await fetch(`${supabaseUrl}/functions/v1/complete-onboarding-after-checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: anonKey,
            },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast({ title: 'Setup incomplete', description: data?.error || 'Please try again.', variant: 'destructive' });
            setCompletingCheckout(false);
            return;
          }
          setSearchParams({});
          navigate('/dashboard', { replace: true });
        } catch (e) {
          toast({ title: 'Something went wrong', variant: 'destructive' });
        } finally {
          setCompletingCheckout(false);
        }
      })();
    }
  }, [searchParams, user, completingCheckout, navigate, setSearchParams, toast]);

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
      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session?.access_token) {
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
          Authorization: `Bearer ${session.access_token}`,
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
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FreelanceFlow</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
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
              {useFirstOptions.map((opt) => (
                <Card
                  key={opt.id}
                  className={`cursor-pointer transition-all border-2 ${selectedUseFirst === opt.id ? 'border-primary' : 'border-transparent hover:border-border'}`}
                  onClick={() => setSelectedUseFirst(opt.id)}
                >
                  <CardContent className="py-4 flex items-center gap-3">
                    <opt.icon className="h-5 w-5 text-primary" />
                    {opt.label}
                  </CardContent>
                </Card>
              ))}
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
              <h1 className="text-2xl font-bold">Optional: your business</h1>
              <p className="text-muted-foreground mt-1">You can change this anytime in Settings.</p>
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
                  <Popover>
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
                            <CommandItem key={c.value} value={`${c.value} ${c.label}`} onSelect={() => setCurrency(c.value)}>
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
              <Button onClick={() => setStep('plan')}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'plan' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Choose your plan</h1>
              <p className="text-muted-foreground mt-1">
                Start your 15-day free trial. Cancel anytime before it ends.
              </p>
            </div>
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center text-sm">
              <p className="font-medium">You won’t be charged today.</p>
              <p className="text-muted-foreground mt-1">
                Trial ends 15 days from now. We’ll remind you before then.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedPlanId === p.id ? 'border-primary' : 'border-transparent hover:border-border'
                  } ${p.highlighted ? 'ring-2 ring-primary/20' : ''}`}
                  onClick={() => setSelectedPlanId(p.id)}
                >
                  {p.highlighted && (
                    <div className="bg-primary text-primary-foreground text-xs font-medium text-center py-1">
                      Best value
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{p.price}</span>
                      <span className="text-muted-foreground text-sm">{p.period}</span>
                    </CardTitle>
                    <CardDescription>{p.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('optional')}>Back</Button>
              <Button onClick={handleContinueToPayment} disabled={loading || !plans.find((p) => p.id === selectedPlanId)?.priceId}>
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
