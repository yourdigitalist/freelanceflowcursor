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
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useTableSort } from '@/hooks/useTableSort';
import { compareDates, compareNumbers, compareStrings } from '@/lib/tableSort';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Filter, BarChart3 } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import {
  type AdminMetricsSummary,
  type AdminUserRow,
  type AdminUserFilter,
  type AdminUserListTab,
  type AdminCouponFilter,
  ADMIN_COUPON_FILTER_OPTIONS,
  formatAdminMoney,
  formatAdminPlan,
  formatPromotionCodeTag,
  hasBetaPromotionCode,
  isAdminMetricsExcludedUser,
  isCouponUser,
  isGhostedUser,
  isOrganicUser,
  isTrialExpiringSoon,
  isTrialUser,
  isUnconfirmedUser,
  matchesCouponFilter,
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

function matchesUserSearch(row: AdminUserRow, query: string): boolean {
  if (!query) return true;
  const haystack = [
    displayName(row),
    row.email,
    row.plan_type,
    row.subscription_status,
    row.stripe_promotion_code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function UserListTable({
  userSort,
}: {
  userSort: ReturnType<typeof useTableSort<AdminUserRow>>;
}) {
  if (userSort.sortedItems.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-14 text-center">
          <h3 className="text-lg font-semibold">No users match</h3>
          <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex flex-col p-0">
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableTableHead label="User" sortKey="user" sort={userSort} />
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </TableHead>
                <SortableTableHead label="Email" sortKey="email" sort={userSort} />
                <SortableTableHead label="Status" sortKey="status" sort={userSort} />
                <SortableTableHead label="Plan" sortKey="plan" sort={userSort} />
                <SortableTableHead label="Signed up" sortKey="signed_up" sort={userSort} />
                <SortableTableHead label="Trial ends" sortKey="trial_ends" sort={userSort} />
                <SortableTableHead label="Last login" sortKey="last_login" sort={userSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {userSort.sortedItems.map((row) => {
                const ghosted = isGhostedUser(row.last_sign_in_at);
                const expiring = isTrialExpiringSoon(row.trial_end_date);
                return (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">{displayName(row)}</TableCell>
                    <TableCell>
                      <UserTagsCell row={row} ghosted={ghosted} />
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
      </CardContent>
    </Card>
  );
}

function UserTagsCell({
  row,
  ghosted,
}: {
  row: AdminUserRow;
  ghosted: boolean;
}) {
  const unconfirmed = isUnconfirmedUser(row);
  const showOnboarding = !row.onboarding_completed && !unconfirmed;
  const showCoupon = hasBetaPromotionCode(row);
  const hasTags = unconfirmed || showOnboarding || ghosted || showCoupon;

  if (!hasTags) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {unconfirmed ? (
        <Badge variant="destructive" className="text-[10px]">
          Unconfirmed
        </Badge>
      ) : null}
      {ghosted ? (
        <Badge variant="secondary" className="text-[10px]">
          Ghosted
        </Badge>
      ) : null}
      {showCoupon ? (
        <Badge
          variant="outline"
          className="text-[10px] border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300"
        >
          {formatPromotionCodeTag(row.stripe_promotion_code)}
        </Badge>
      ) : null}
    </div>
  );
}

export default function AdminMetrics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetricsSummary | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminUserFilter>('all');
  const [userListTab, setUserListTab] = useState<AdminUserListTab>('all');
  const [couponFilter, setCouponFilter] = useState<AdminCouponFilter>('all');

  const syncCouponsFromStripe = useCallback(async () => {
    try {
      const syncRes = await supabase.functions.invoke('sync-stripe-promotion-codes', { body: {} });
      if (syncRes.error) {
        console.warn('Coupon sync failed:', syncRes.error);
        return null;
      }
      return syncRes.data as { updated?: number } | null;
    } catch (error) {
      console.warn('Coupon sync failed:', error);
      return null;
    }
  }, []);

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

      if (silent) {
        void (async () => {
          const syncData = await syncCouponsFromStripe();
          if (!syncData || (syncData.updated ?? 0) === 0) return;
          const usersRes = await supabase.rpc('get_admin_users_list');
          if (usersRes.error) return;
          const usersData = usersRes.data;
          if (usersData && typeof usersData === 'object' && 'error' in (usersData as object)) return;
          setUsers(Array.isArray(usersData) ? (usersData as AdminUserRow[]) : []);
          toast({
            title: 'Coupons synced',
            description: `Updated ${syncData.updated} user${syncData.updated === 1 ? '' : 's'} from Stripe.`,
          });
        })();
      }
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
  }, [toast, syncCouponsFromStripe]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleUsers = useMemo(
    () => users.filter((row) => !isAdminMetricsExcludedUser(row)),
    [users],
  );

  const couponUsers = useMemo(
    () => visibleUsers.filter((row) => isCouponUser(row)),
    [visibleUsers],
  );

  const trialUsers = useMemo(
    () => visibleUsers.filter((row) => isTrialUser(row)),
    [visibleUsers],
  );

  const organicUsers = useMemo(
    () => visibleUsers.filter((row) => isOrganicUser(row)),
    [visibleUsers],
  );

  const hiddenCouponCount = useMemo(
    () => users.filter((row) => isCouponUser(row) && isAdminMetricsExcludedUser(row)).length,
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleUsers.filter((row) => {
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
      if (statusFilter === 'unconfirmed' && !isUnconfirmedUser(row)) {
        return false;
      }

      return matchesUserSearch(row, q);
    });
  }, [visibleUsers, searchQuery, statusFilter]);

  const filteredCouponUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return couponUsers.filter((row) => {
      if (!matchesCouponFilter(row, couponFilter)) return false;
      return matchesUserSearch(row, q);
    });
  }, [couponUsers, searchQuery, couponFilter]);

  const filteredTrialUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trialUsers.filter((row) => matchesUserSearch(row, q));
  }, [trialUsers, searchQuery]);

  const listUsers =
    userListTab === 'coupons'
      ? filteredCouponUsers
      : userListTab === 'trials'
        ? filteredTrialUsers
        : filteredUsers;

  const listTotal =
    userListTab === 'coupons'
      ? couponUsers.filter((row) => matchesCouponFilter(row, couponFilter)).length
      : userListTab === 'trials'
        ? trialUsers.length
        : visibleUsers.length;

  const userSortComparators = useMemo(
    () => ({
      user: (a: AdminUserRow, b: AdminUserRow) => compareStrings(displayName(a), displayName(b)),
      email: (a: AdminUserRow, b: AdminUserRow) => compareStrings(a.email ?? '', b.email ?? ''),
      status: (a: AdminUserRow, b: AdminUserRow) =>
        compareStrings(a.subscription_status ?? '', b.subscription_status ?? ''),
      plan: (a: AdminUserRow, b: AdminUserRow) => compareStrings(a.plan_type ?? '', b.plan_type ?? ''),
      signed_up: (a: AdminUserRow, b: AdminUserRow) => compareDates(a.created_at, b.created_at),
      trial_ends: (a: AdminUserRow, b: AdminUserRow) => {
        const ta = a.trial_end_date ? new Date(a.trial_end_date).getTime() : Infinity;
        const tb = b.trial_end_date ? new Date(b.trial_end_date).getTime() : Infinity;
        return compareNumbers(ta, tb);
      },
      last_login: (a: AdminUserRow, b: AdminUserRow) => {
        const ta = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : Infinity;
        const tb = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : Infinity;
        return compareNumbers(ta, tb);
      },
    }),
    [],
  );

  const userSort = useTableSort(listUsers, userSortComparators);

  const hotlistUsers = useMemo(
    () =>
      visibleUsers.filter(
        (row) =>
          (row.subscription_status || '').toLowerCase() === 'trial' &&
          isTrialExpiringSoon(row.trial_end_date),
      ),
    [visibleUsers],
  );

  const unconfirmedUsers = useMemo(
    () => visibleUsers.filter((row) => isUnconfirmedUser(row)),
    [visibleUsers],
  );

  const activeFilterCount = statusFilter === 'all' ? 0 : 1;
  const activeCouponFilterCount = couponFilter === 'all' ? 0 : 1;

  const activeWithoutCoupon = useMemo(
    () =>
      visibleUsers.filter(
        (row) =>
          (row.subscription_status || '').toLowerCase() === 'active' && !row.stripe_promotion_code?.trim(),
      ),
    [visibleUsers],
  );

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

      {activeWithoutCoupon.length > 0 ? (
        <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {activeWithoutCoupon.length} active user{activeWithoutCoupon.length === 1 ? '' : 's'} have no coupon
              synced yet
            </p>
            <p className="text-muted-foreground mt-1">
              Revenue counts them as paying until Stripe codes are pulled. Hit Refresh to sync from Stripe.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {metrics ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Users</h2>
            <PageSummaryBar columns={6}>
              <PageSummaryStat
                label="Total signups"
                value={String(metrics.total_signups)}
                hideDot
              />
              <PageSummaryStat
                label="Unconfirmed email"
                value={String(metrics.unconfirmed_signups ?? 0)}
                subtitle={`${metrics.unconfirmed_signups_this_week ?? 0} this week · ${metrics.unconfirmed_signups_this_month ?? 0} this month`}
                status="pending_signatures"
                onClick={() => setStatusFilter('unconfirmed')}
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
              <PageSummaryStat
                label="Coupon users"
                value={String(couponUsers.length)}
                subtitle={
                  hiddenCouponCount > 0
                    ? `${metrics.beta_testers ?? 0} in Stripe · ${hiddenCouponCount} admin hidden`
                    : 'BETATESTERS, MGTEST, MGTEST2'
                }
                status="pending_signatures"
                onClick={() => setUserListTab('coupons')}
              />
            </PageSummaryBar>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Excludes beta coupon users (BETATESTERS, MGTEST, MGTEST2), including comped active subs.
              </p>
            </div>
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
                value={String(trialUsers.length)}
                subtitle={`${metrics.active_trials} total · usually no coupon yet`}
                status="trial"
                onClick={() => setUserListTab('trials')}
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

      {unconfirmedUsers.length > 0 ? (
        <Card className="border-rose-200/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Awaiting email confirmation</CardTitle>
            <CardDescription>
              Signed up with name and email but have not clicked the confirmation link yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Signed up</TableHead>
                    <TableHead>Confirmation sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unconfirmedUsers.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-medium">{displayName(row)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email || '—'}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(row.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {row.confirmation_sent_at
                          ? formatDistanceToNow(new Date(row.confirmation_sent_at), { addSuffix: true })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableFrame>
          </CardContent>
        </Card>
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
        <Tabs
          value={userListTab}
          onValueChange={(value) => setUserListTab(value as AdminUserListTab)}
          className="space-y-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Users</h2>
                <p className="text-sm text-muted-foreground">
                  {userListTab === 'coupons'
                    ? 'Completed checkout with BETATESTERS, MGTEST, or MGTEST2.'
                    : userListTab === 'trials'
                      ? 'On trial, no coupon yet — signed up but haven’t finished checkout (or abandoned).'
                      : 'Everyone except hidden admin test accounts. Ghosted = no login in 30 days.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {visibleUsers.length} shown = {couponUsers.length} coupons + {organicUsers.length} no coupon
                  {hiddenCouponCount > 0 || users.length > visibleUsers.length
                    ? ` · ${users.length - visibleUsers.length} admin hidden`
                    : ''}
                </p>
              </div>
              <TabsList>
                <TabsTrigger value="all">
                  All users
                  <span className="ml-1.5 text-xs text-muted-foreground">({visibleUsers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="coupons">
                  Coupons
                  <span className="ml-1.5 text-xs text-muted-foreground">({couponUsers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="trials">
                  Trials
                  <span className="ml-1.5 text-xs text-muted-foreground">({trialUsers.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
              <PageSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search name, email, plan, coupon..."
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative h-8 w-8 p-0 ml-auto"
                    aria-label="Filters"
                  >
                    <Filter className="h-4 w-4" />
                    {(userListTab === 'all'
                  ? activeFilterCount
                  : userListTab === 'coupons'
                    ? activeCouponFilterCount
                    : 0) > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                        {userListTab === 'all' ? activeFilterCount : activeCouponFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-4" align="end">
                  <div className="space-y-3">
                    {userListTab === 'coupons' ? (
                      <>
                        <Select
                          value={couponFilter}
                          onValueChange={(v) => setCouponFilter(v as AdminCouponFilter)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Coupon" />
                          </SelectTrigger>
                          <SelectContent>
                            {ADMIN_COUPON_FILTER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {activeCouponFilterCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-full"
                            onClick={() => setCouponFilter('all')}
                          >
                            Reset filters
                          </Button>
                        ) : null}
                      </>
                    ) : userListTab === 'all' ? (
                      <>
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
                            <SelectItem value="unconfirmed">Unconfirmed email</SelectItem>
                            <SelectItem value="ghosted">Ghosted (30d+)</SelectItem>
                          </SelectContent>
                        </Select>
                        {activeFilterCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-full"
                            onClick={() => setStatusFilter('all')}
                          >
                            Reset filters
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <TabsContent value="all" className="mt-0 space-y-4">
            <UserListTable userSort={userSort} />
            <p className="text-xs text-muted-foreground">
              Showing {userSort.sortedItems.length} of {listTotal} users
            </p>
          </TabsContent>

          <TabsContent value="coupons" className="mt-0 space-y-4">
            <UserListTable userSort={userSort} />
            <p className="text-xs text-muted-foreground">
              Showing {userSort.sortedItems.length} of {listTotal} coupon users
            </p>
          </TabsContent>

          <TabsContent value="trials" className="mt-0 space-y-4">
            <UserListTable userSort={userSort} />
            <p className="text-xs text-muted-foreground">
              Showing {userSort.sortedItems.length} of {listTotal} trial users (no coupon)
            </p>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
