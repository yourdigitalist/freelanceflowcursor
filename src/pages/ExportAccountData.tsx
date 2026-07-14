import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from '@/components/icons';

export default function ExportAccountData() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const runExport = async (exportToken?: string | null) => {
    setStatus('loading');
    setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers: Record<string, string> = {};
      let url = `${supabaseUrl}/functions/v1/export-account-data`;

      if (exportToken) {
        url += `?token=${encodeURIComponent(exportToken)}`;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Sign in to export your data, or use the link from your email.');
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Export failed');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `lance-account-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  useEffect(() => {
    if (token) {
      void runExport(token);
    }
  }, [token]);

  if (authLoading && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Export your Lance data</CardTitle>
          <CardDescription>
            Download a JSON copy of your clients, projects, invoices, time entries, and other account data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your export…
            </div>
          ) : null}
          {status === 'done' ? (
            <p className="text-sm text-success">Download started. Check your downloads folder.</p>
          ) : null}
          {status === 'error' ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {!token && user ? (
            <Button onClick={() => { void runExport(); }} disabled={status === 'loading'}>
              {status === 'loading' ? 'Exporting…' : 'Download export'}
            </Button>
          ) : null}
          {!token && !user ? (
            <p className="text-sm text-muted-foreground">
              Sign in to export from Settings, or use the export link from your account deletion warning email.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
