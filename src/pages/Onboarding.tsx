import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/AppLogo';
import { Loader2, LogOut } from '@/components/icons';
import { ShieldCheck } from 'lucide-react';
import { currencies } from '@/lib/locale-data';
import { isEmailVerified } from '@/lib/emailVerification';
import {
  trackMetaCompleteRegistration,
  trackMetaStartTrial,
} from '@/lib/metaPixel';

const STRIPE_PRICE_ANNUAL = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as string | undefined;
const DEFAULT_PLAN_ID = 'pro_annual';

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

function StripeSecuredBy() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 py-6 mt-2 border-t border-border/60">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden />
        <span>No credit card required to start</span>
      </div>
      <div className="hidden sm:block h-4 w-px bg-border shrink-0" aria-hidden />
      <a
        href="https://stripe.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="text-xs uppercase tracking-wide">Billing powered by</span>
        <img src="/stripe-logo.svg" alt="Stripe" className="h-6 w-auto shrink-0" />
      </a>
    </div>
  );
}

export default function Onboarding() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const resendSyncAttemptedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    trackMetaCompleteRegistration();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || resendSyncAttemptedRef.current || !isEmailVerified(user)) return;
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
  }, [user]);

  const saveProfile = async () => {
    if (!user?.id) return;
    const updates: Record<string, unknown> = {};
    if (businessName.trim()) updates.business_name = businessName.trim();
    if (currency) updates.currency = currency;
    if (Object.keys(updates).length === 0) return;
    await supabase.from('profiles').update(updates).eq('user_id', user.id);
  };

  const handleStartFreeTrial = async () => {
    if (!businessName.trim()) {
      toast({
        title: 'Business name required',
        description: 'Enter your business name to continue.',
        variant: 'destructive',
      });
      return;
    }
    if (!STRIPE_PRICE_ANNUAL) {
      toast({ title: 'Stripe not configured', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await saveProfile();
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
      const res = await fetch(`${supabaseUrl}/functions/v1/start-free-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ priceId: STRIPE_PRICE_ANNUAL }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data?.error || data?.message || res.statusText || `Could not start trial (${res.status})`;
        toast({ title: 'Could not start trial', description: String(errMsg), variant: 'destructive' });
        setLoading(false);
        return;
      }
      trackMetaStartTrial(DEFAULT_PLAN_ID);
      navigate('/dashboard', { replace: true });
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <AppLogo full height={28} />
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-lg">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Set up your workspace</h1>
            <p className="text-muted-foreground">
              Start your 15-day free trial. No credit card required.
            </p>
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
                  autoFocus
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

          <div className="space-y-4">
            <Button
              onClick={handleStartFreeTrial}
              disabled={loading || !businessName.trim()}
              size="lg"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start free trial
            </Button>
            <StripeSecuredBy />
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/terms" className="text-primary hover:underline">Terms and conditions</Link>
              {' · '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy policy</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
