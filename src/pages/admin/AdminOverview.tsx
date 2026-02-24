import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, FolderKanban, FileText, Clock, Building2 } from 'lucide-react';

interface AdminStats {
  total_users: number;
  total_projects: number;
  total_invoices: number;
  total_time_entries: number;
  total_clients: number;
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('get_admin_stats');
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
        setStats(null);
      } else if (data && typeof data === 'object' && 'error' in data) {
        setError('You don’t have permission to view these stats.');
        setStats(null);
      } else {
        setStats(data as AdminStats);
        setError(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  const cards = [
    { title: 'Total users', value: stats?.total_users ?? 0, icon: Users, description: 'Accounts with a profile' },
    { title: 'Active clients', value: stats?.total_clients ?? 0, icon: Building2, description: 'Across all users' },
    { title: 'Projects', value: stats?.total_projects ?? 0, icon: FolderKanban, description: 'Total projects' },
    { title: 'Invoices', value: stats?.total_invoices ?? 0, icon: FileText, description: 'Total invoices' },
    { title: 'Time entries', value: stats?.total_time_entries ?? 0, icon: Clock, description: 'Logged time entries' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Simple usage metrics. To add “active in last 30 days” later, you can track last sign-in or a <code className="text-xs bg-muted px-1 rounded">last_seen_at</code> on profiles.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, description }) => (
          <Card key={title} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
