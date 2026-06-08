import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSearchInput } from '@/components/ui/page-search-input';
import { PageSummaryBar, PageSummaryStat } from '@/components/ui/page-summary-stats';
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Filter, BarChart3 } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import {
  type AdminMetricsSummary,
  type AdminUserRow,
  type AdminUserFilter,
  formatAdminMoney,
  formatAdminPlan,
  isGhostedUser,
  isTrialExpiringSoon,
} from '@/lib/adminMetrics';
import { cn } from '@/lib/utils';

function statusBadgeVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'default';
  if (s === 'trial') return 'secondary';
  if (s === 'past_due') return 'destructive';
  if (s === 'canceled' || s === 'cancelled') return 'outline';
  return 'outline';
}

function formatStatusLabel(status: string | null): string {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayName(row: AdminUserRow): string {
  if (row.full_name?.trim()) return row.full_name.trim();
  if (row.email?.trim()) return row.email.trim();
  return 'Unnamed user';
}

export default function AdminMetrics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetricsSummary | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminUserFilter>('all');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [metricsRes, usersRes] = await Promise.all([
        supabase.rpc('get_admin_metrics'),
        supabase.rpc('get_admin_users_list'),
      ]);

      if (metricsRes.error) throw metricsRes.error;
      if (usersRes.error) throw usersRes.error;

      const metricsData = metricsRes.data as Record<string, unknown> | null;
      if (metricsData && 'error' in metricsData) {
        throw new Error('Unauthorized');
      }
      setMetrics(metricsData as unknown as AdminMetricsSummary);

      const usersData = usersRes.data;
      if (usersData && typeof usersData === 'object' && 'error' in (usersData as object)) {
        throw new Error('Unauthorized');
      }
      setUsers(Array.isArray(usersData) ? (usersData as AdminUserRow[]) : []);
    } catch (error) {
      console.error('Admin metrics load failed:', error);
      toast({
        title: 'Failed to load metrics',
        description: 'Make sure the admin metrics migration has been applied.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((row) => {
      if (statusFilter === 'trial' && (row.subscription_status || '').toLowerCase() !== 'trial') {
        return false;
      }
      if (statusFilter === 'active' && (row.subscription_status || '').toLowerCase() !== 'active') {
        return false;
      }
      if (
        statusFilter === 'canceled' &&
        !['canceled', 'cancelled'].includes((row.subscription_status || '').toLowerCase())
      ) {
        return false;
      }
      if (statusFilter === 'past_due' && (row.subscription_status || '').toLowerCase() !== 'past_due') {
        return false;
      }
      if (
        statusFilter === 'expiring_7d' &&
        !(
          (row.subscription_status || '').toLowerCase() === 'trial' &&
          isTrialExpiringSoon(row.trial_end_date)
        )
      ) {
        return false;
      }
      if (statusFilter === 'ghosted' && !isGhostedUser(row.last_sign_in_at)) {
        return false;
      }

      if (!q) return true;
      const haystack = [displayName(row), row.email, row.plan_type, row.subscription_status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, searchQuery, statusFilter]);

  const hotlistUsers = useMemo(
    () =>
      users.filter(
        (row) =>
          (row.subscription_status || '').toLowerCase() === 'trial' &&
          isTrialExpiringSoon(row.trial_end_date),
      ),
    [users],
  );

  const activeFilterCount = statusFilter === 'all' ? 0 : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Metrics
          </h1>
          <p className="text-muted-foreground mt-1">
            Users, revenue, and trials. Traffic analytics (GA) can be linked here later.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData(true)}
          disabled={refreshing}
          className="shrink-0"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {metrics ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Users</h2>
            <PageSummaryBar columns={4}>
              <PageSummaryStat
                label="Total signups"
                value={String(metrics.total_signups)}
                hideDot
              />
              <PageSummaryStat
                label="This week"
                value={String(metrics.signups_this_week)}
                subtitle="New signups"
                status="active"
              />
              <PageSummaryStat
                label="This month"
                value={String(metrics.signups_this_month)}
                subtitle="New signups"
                status="active"
              />
              <PageSummaryStat
                label="Trial vs paying"
                value={`${metrics.trial_users} / ${metrics.paying_users}`}
                subtitle={`${metrics.past_due_users} past due · ${metrics.canceled_users} canceled`}
                status="trial"
              />
            </PageSummaryBar>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue</h2>
            <PageSummaryBar columns={4}>
              <PageSummaryStat
                label="MRR"
                value={formatAdminMoney(metrics.mrr)}
                subtitle="Monthly recurring revenue"
                hideDot
              />
              <PageSummaryStat
                label="ARR"
                value={formatAdminMoney(metrics.arr)}
                subtitle="Annual run rate"
                hideDot
              />
              <PageSummaryStat
                label="New MRR this month"
                value={formatAdminMoney(metrics.new_mrr_this_month)}
                subtitle={`${metrics.new_paid_this_month} new paying user${metrics.new_paid_this_month === 1 ? '' : 's'}`}
                status="active"
              />
              <PageSummaryStat
                label="Churned this month"
                value={String(metrics.churned_this_month)}
                subtitle="Canceled subscriptions"
                status="cancelled"
              />
            </PageSummaryBar>
            <PageSummaryBar columns={2}>
              <PageSummaryStat
                label="Monthly plan"
                value={String(metrics.monthly_subscribers)}
                subtitle="Active subscribers at $29/mo"
                status="active"
              />
              <PageSummaryStat
                label="Annual plan"
                value={String(metrics.annual_subscribers)}
                subtitle="Active subscribers at $290/yr"
                status="active"
              />
            </PageSummaryBar>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Trials</h2>
            <PageSummaryBar columns={3}>
              <PageSummaryStat
                label="Active trials"
                value={String(metrics.active_trials)}
                status="trial"
              />
              <PageSummaryStat
                label="Expiring in 7 days"
                value={String(metrics.trials_expiring_7d)}
                subtitle="Outreach hotlist"
                status="pending_signatures"
                onClick={() => setStatusFilter('expiring_7d')}
              />
              <PageSummaryStat
                label="Trial → paid"
                value={`${metrics.trial_to_paid_conversion_rate}%`}
                subtitle={`${metrics.converted_active} active of ${metrics.ever_trialed} ever trialed`}
                status="signed"
              />
            </PageSummaryBar>
          </section>
        </>
      ) : null}

      {hotlistUsers.length > 0 ? (
        <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trials expiring soon</CardTitle>
            <CardDescription>Reach out before these users churn.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Trial ends</TableHead>
                    <TableHead>Last login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotlistUsers.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-medium">{displayName(row)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email || '—'}</TableCell>
                      <TableCell>
                        {row.trial_end_date
                          ? format(new Date(row.trial_end_date), 'dd MMM yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.last_sign_in_at
                          ? formatDistanceToNow(new Date(row.last_sign_in_at), { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableFrame>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">All users</h2>
          <p className="text-sm text-muted-foreground">
            Last login from Supabase Auth. Ghosted = no login in 30 days.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search name, email, plan..."
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative h-8 w-8 p-0 ml-auto" aria-label="Filters">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-4" align="end">
              <div className="space-y-3">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as AdminUserFilter)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="trial">On trial</SelectItem>
                    <SelectItem value="active">Paying (active)</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="expiring_7d">Trial expiring (7d)</SelectItem>
                    <SelectItem value="ghosted">Ghosted (30d+)</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 ? (
                  <Button variant="ghost" size="sm" className="h-8 w-full" onClick={() => setStatusFilter('all')}>
                    Reset filters
                  </Button>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col p-0">
            {filteredUsers.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold">No users match</h3>
                <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
              </div>
            ) : (
              <DataTableFrame>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Signed up</TableHead>
                      <TableHead>Trial ends</TableHead>
                      <TableHead>Last login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((row) => {
                      const ghosted = isGhostedUser(row.last_sign_in_at);
                      const expiring = isTrialExpiringSoon(row.trial_end_date);
                      return (
                        <TableRow key={row.user_id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-wrap items-center gap-2">
                              {displayName(row)}
                              {!row.onboarding_completed ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Onboarding
                                </Badge>
                              ) : null}
                              {ghosted ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Ghosted
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.email || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(row.subscription_status)}>
                              {formatStatusLabel(row.subscription_status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatAdminPlan(row.plan_type)}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {format(new Date(row.created_at), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'whitespace-nowrap',
                              expiring ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
                            )}
                          >
                            {row.trial_end_date
                              ? format(new Date(row.trial_end_date), 'dd MMM yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {row.last_sign_in_at
                              ? formatDistanceToNow(new Date(row.last_sign_in_at), { addSuffix: true })
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </DataTableFrame>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </section>
    </div>
  );
}
