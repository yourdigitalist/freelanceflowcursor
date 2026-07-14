import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from '@/components/icons';

type RestorableAccount = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  account_soft_deleted_at: string | null;
  restore_until: string | null;
};

export default function AdminAccountRestore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<RestorableAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_restorable_accounts');
      if (error) throw error;
      setRows((data as RestorableAccount[]) || []);
    } catch (error) {
      toast({
        title: 'Failed to load restorable accounts',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) void fetchRows();
  }, [user, fetchRows]);

  const handleRestore = async (row: RestorableAccount) => {
    setRestoringId(row.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('restore-account', {
        body: { userId: row.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Account restored',
        description: `${row.email || row.full_name || row.user_id} can sign in again.`,
      });
      void fetchRows();
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account restore</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Soft-deleted accounts are kept for 30 days. Restore here when someone emails hello@getlance.app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restorable accounts</CardTitle>
          <CardDescription>
            These users were deactivated by automated cleanup and are still within the restore window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No accounts waiting for restore.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{row.full_name || row.email || row.user_id}</p>
                    <p className="text-sm text-muted-foreground">{row.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deactivated{' '}
                      {row.account_soft_deleted_at
                        ? format(new Date(row.account_soft_deleted_at), 'MMM d, yyyy')
                        : '—'}
                      {' · '}
                      Restore by{' '}
                      {row.restore_until
                        ? format(new Date(row.restore_until), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => { void handleRestore(row); }}
                    disabled={restoringId === row.user_id}
                  >
                    {restoringId === row.user_id ? 'Restoring…' : 'Restore account'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
