import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function SystemCheck() {
  const { user } = useAuth();
  const { toast } = useToast();
  const defaultEmail = useMemo(() => user?.email ?? '', [user?.email]);

  const [trialTestEmail, setTrialTestEmail] = useState(defaultEmail);
  const [sendingTrialTest, setSendingTrialTest] = useState(false);
  const [trialTestResult, setTrialTestResult] = useState<string>('');

  const [checkingBilling, setCheckingBilling] = useState(false);
  const [billingResult, setBillingResult] = useState<string>('');

  const sendTrialReminderTest = async () => {
    setTrialTestResult('');
    setSendingTrialTest(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!token || !supabaseUrl) throw new Error('Missing session or Supabase URL');

      const res = await fetch(`${supabaseUrl}/functions/v1/send-trial-reminders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: trialTestEmail, testDaysLeft: 5, testName: user?.user_metadata?.full_name || user?.email || 'there' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setTrialTestResult(`Sent ${json?.sent ?? 0} of ${json?.total ?? 0} (test mode)`);
      toast({ title: 'Trial reminder test triggered', description: 'Check your inbox (and spam) for delivery.' });
    } catch (err: any) {
      setTrialTestResult(err?.message || 'Failed');
      toast({ title: 'Failed to send test email', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSendingTrialTest(false);
    }
  };

  const runBillingHealthCheck = async () => {
    setBillingResult('');
    setCheckingBilling(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!token || !supabaseUrl) throw new Error('Missing session or Supabase URL');

      const res = await fetch(`${supabaseUrl}/functions/v1/billing-health`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setBillingResult(`OK (account ${json?.accountId || 'unknown'}, livemode=${String(json?.livemode)})`);
      toast({ title: 'Stripe check passed', description: 'Stripe secret is configured and reachable.' });
    } catch (err: any) {
      setBillingResult(err?.message || 'Failed');
      toast({ title: 'Stripe check failed', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setCheckingBilling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System check</h1>
        <p className="text-muted-foreground">Quick production smoke checks for the most failure-prone systems (email, auth, billing).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email deliverability</CardTitle>
            <CardDescription>
              Triggers a single-recipient test email via the `send-trial-reminders` Edge Function (admin auth required).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Send a test trial reminder to</Label>
              <Input
                value={trialTestEmail}
                onChange={(e) => setTrialTestEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
              />
            </div>
            <Button onClick={sendTrialReminderTest} disabled={sendingTrialTest || !trialTestEmail.trim()}>
              {sendingTrialTest ? 'Sending…' : 'Send test email'}
            </Button>
            {trialTestResult ? (
              <p className="text-sm text-muted-foreground">Result: {trialTestResult}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual checks (launch day)</CardTitle>
            <CardDescription>
              These require real flows because they validate templates, links, and attachments end-to-end.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>- Send a real review request to yourself (Approvals → Send).</p>
            <p>- Send a real invoice email to yourself (Invoices → Send).</p>
            <p>- Run a password reset (Auth → “Forgot password”).</p>
            <p>- Verify inbox placement across Gmail/Outlook/iCloud.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing (Stripe)</CardTitle>
            <CardDescription>
              Confirms Stripe is configured and reachable (does not create a checkout session).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runBillingHealthCheck} disabled={checkingBilling}>
              {checkingBilling ? 'Checking…' : 'Run Stripe health check'}
            </Button>
            {billingResult ? (
              <p className="text-sm text-muted-foreground">Result: {billingResult}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

