import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STRIPE_FEES_URL = 'https://stripe.com/pricing';

interface PaymentsProfile {
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_details_submitted: boolean | null;
  stripe_connect_fees_acknowledged_at: string | null;
  stripe_connect_connected_at: string | null;
}

export default function PaymentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<PaymentsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feesAcked, setFeesAcked] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_details_submitted, stripe_connect_fees_acknowledged_at, stripe_connect_connected_at',
        )
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data as PaymentsProfile | null);
      if (data?.stripe_connect_fees_acknowledged_at) {
        setFeesAcked(true);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load payment settings',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const connect = searchParams.get('connect');
    if (!connect || !user) return;

    const sync = async () => {
      setBusy(true);
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (!session?.access_token) throw new Error('Please sign in again');
        const { data, error } = await supabase.functions.invoke('create-connect-account-link', {
          body: { syncOnly: true },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        await fetchProfile();
        if (data?.ready || data?.chargesEnabled) {
          toast({
            title: 'Stripe connected',
            description: 'Clients can pay your invoices by card when you send them.',
          });
        } else {
          toast({
            title: 'Onboarding in progress',
            description: 'Finish any remaining steps in Stripe, then refresh this page.',
          });
        }
      } catch (e) {
        console.error(e);
        toast({
          title: 'Could not sync Stripe status',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setBusy(false);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('connect');
          return next;
        }, { replace: true });
      }
    };

    void sync();
  }, [searchParams, user, fetchProfile, setSearchParams, toast]);

  const invokeAuthed = async (fn: string, body: Record<string, unknown>) => {
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Please sign in again');
    }
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleConnect = async () => {
    if (!feesAcked) {
      toast({
        title: 'Acknowledgement required',
        description: 'Please confirm you understand Stripe processing fees before connecting.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const data = await invokeAuthed('create-connect-account-link', {
        feesAcknowledged: true,
      });
      if (!data?.url) throw new Error('No Stripe onboarding URL returned');
      window.location.href = data.url as string;
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not start Stripe Connect',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  const handleContinueOnboarding = async () => {
    setBusy(true);
    try {
      const data = await invokeAuthed('create-connect-account-link', {
        feesAcknowledged: true,
        refresh: true,
      });
      if (!data?.url) throw new Error('No Stripe onboarding URL returned');
      window.location.href = data.url as string;
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not open Stripe',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Stripe from Lance? Existing unpaid Pay now links will stop working until you reconnect.')) {
      return;
    }
    setBusy(true);
    try {
      await invokeAuthed('disconnect-connect-account', {});
      setFeesAcked(false);
      await fetchProfile();
      toast({ title: 'Stripe disconnected', description: 'Invoice emails will no longer include Pay now.' });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not disconnect',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const connected = Boolean(profile?.stripe_connect_account_id);
  const ready =
    connected &&
    Boolean(profile?.stripe_connect_charges_enabled) &&
    Boolean(profile?.stripe_connect_fees_acknowledged_at);
  const needsOnboarding = connected && !profile?.stripe_connect_charges_enabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Let clients pay invoices by card via Stripe Connect. This is separate from your Lance subscription billing.
        </p>
      </div>

      <Alert>
        <AlertTitle>Test mode</AlertTitle>
        <AlertDescription>
          Client payment collection uses Stripe <strong>test mode</strong> only. It does not use your live Lance
          subscription Stripe keys and will not affect live ads or SaaS billing.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stripe Connect</CardTitle>
          <CardDescription>
            Money from invoice payments goes to your Stripe account. Lance does not take a cut and does not hold client funds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {ready ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Ready to collect</Badge>
            ) : needsOnboarding ? (
              <Badge variant="secondary">Onboarding incomplete</Badge>
            ) : connected ? (
              <Badge variant="secondary">Connected</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
            {profile?.stripe_connect_account_id ? (
              <span className="text-xs text-muted-foreground font-mono">
                {profile.stripe_connect_account_id}
              </span>
            ) : null}
          </div>

          {!ready ? (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex gap-3 items-start">
                <Checkbox
                  id="stripe-fees-ack"
                  checked={feesAcked}
                  onCheckedChange={(v) => setFeesAcked(v === true)}
                  disabled={busy || Boolean(profile?.stripe_connect_fees_acknowledged_at)}
                />
                <Label htmlFor="stripe-fees-ack" className="text-sm font-normal leading-relaxed cursor-pointer">
                  I understand that Stripe charges payment processing fees on invoice payments, and that these fees
                  are charged by Stripe to my Stripe account — not by Lance. I have reviewed{' '}
                  <a
                    href={STRIPE_FEES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Stripe&apos;s pricing
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </Label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Fee acknowledgement recorded
              {profile?.stripe_connect_fees_acknowledged_at
                ? ` on ${new Date(profile.stripe_connect_fees_acknowledged_at).toLocaleDateString()}`
                : ''}
              . See{' '}
              <a
                href={STRIPE_FEES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Stripe pricing
              </a>
              .
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!connected ? (
              <Button onClick={handleConnect} disabled={busy || !feesAcked}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Connect Stripe (test)
              </Button>
            ) : null}
            {needsOnboarding ? (
              <Button onClick={handleContinueOnboarding} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue Stripe onboarding
              </Button>
            ) : null}
            {ready ? (
              <Button variant="outline" onClick={handleContinueOnboarding} disabled={busy}>
                Open Stripe account
              </Button>
            ) : null}
            {connected ? (
              <Button variant="ghost" onClick={handleDisconnect} disabled={busy} className="text-destructive">
                Disconnect
              </Button>
            ) : null}
          </div>

          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>When connected, invoice emails and the client portal can show a Pay now button.</li>
            <li>Paid invoices are marked paid automatically after successful Checkout.</li>
            <li>Bank transfer details on invoices still work as a fallback.</li>
            <li>Your Lance subscription is billed separately under Billing and Subscription.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
