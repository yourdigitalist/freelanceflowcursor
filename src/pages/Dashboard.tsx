import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfileCurrency } from '@/hooks/useProfileCurrency';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Receipt, CheckCircle, ArrowRight, ChevronUp, ChevronDown, CheckSquare, Clock as ClockIcon, FileText } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import type { IconSlotKey } from '@/lib/iconSlots';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { shellProfileDisplayName, useShellProfile } from '@/hooks/useShellProfile';
import { formatLocaleDate } from '@/lib/datetime';
import { TableStatusBadge } from '@/components/ui/table-status-badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { usePagination, DASHBOARD_PAGE_SIZE } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { PageSummaryStat } from '@/components/ui/page-summary-stats';
import { EmptyValue } from '@/components/ui/empty-value';

type RangeKey = 'day' | 'week' | 'month';
type HoursRangeKey = 'week' | 'month';

interface DashboardStats {
  activeProjects: number;
  pendingInvoices: number;
  pendingProposals: number;
  pendingContracts: number;
  pendingAmount: number;
  hoursThisMonth: number;
  unbilledHours: number;
  unbilledAmount: number;
  prevMonthHours: number;
  collectedThisMonth: number;
}

interface RecentProject {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  due_date: string | null;
  hours: number;
  task_count: number;
  completed_tasks: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  due_date: string | null;
}

type PriorityCategory = 'delivery' | 'finance' | 'approval' | 'crm';

type PriorityFilter = 'all' | 'overdue' | 'due_soon' | 'finance';

interface PriorityItem {
  id: string;
  label: string;
  tone: 'overdue' | 'soon' | 'info';
  category: PriorityCategory;
  title: string;
  subtitle: string;
  ctaLabel: string;
  to: string;
  rank: number;
  sortDate: number;
}

function matchesPriorityFilter(item: PriorityItem, filter: PriorityFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'overdue':
      return item.tone === 'overdue';
    case 'due_soon':
      return item.tone === 'soon' || (item.tone === 'info' && item.category !== 'finance');
    case 'finance':
      return item.category === 'finance';
  }
}

const PRIORITY_FILTER_LABELS: Record<PriorityFilter, string> = {
  all: 'All',
  overdue: 'Overdue',
  due_soon: 'Due soon',
  finance: 'Finance',
};

const PRIORITY_FILTERS: PriorityFilter[] = ['all', 'overdue', 'due_soon', 'finance'];

interface RecentItem {
  id: string;
  kind: 'project' | 'task' | 'time' | 'note' | 'invoice';
  title: string;
  subtitle: string;
  updated_at: string;
  to: string;
}

interface RawTimeEntry {
  start_time: string | null;
  started_at: string | null;
  hours: number;
  billable: boolean | null;
  billing_status: string | null;
  hourly_rate: number | null;
}

interface RawInvoice {
  total: number;
  status: string;
  issue_date: string | null;
  paid_date: string | null;
  created_at: string;
}

interface SparkPoint {
  v: number;
}

type ProjectTabKey = 'active' | 'on_hold' | 'completed';

const TONE_STYLES: Record<PriorityItem['tone'], string> = {
  overdue: 'bg-destructive/10 text-destructive',
  soon: 'bg-warning/10 text-warning',
  info: 'bg-primary/10 text-primary',
};

function getTimeEntryDate(entry: Pick<RawTimeEntry, 'started_at' | 'start_time'>): Date | null {
  const value = entry.started_at || entry.start_time;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function RecentItemIcon({ kind }: { kind: RecentItem['kind'] }) {
  const Icon =
    kind === 'project'
      ? FileText
      : kind === 'task'
        ? CheckSquare
        : kind === 'time'
          ? ClockIcon
          : kind === 'note'
            ? FileText
            : Receipt;
  return <Icon className="h-4 w-4 text-muted-foreground" />;
}

/** Show in "Needs you today" when due/expiry is within this many days (or already past). */
const SOON_DAYS = 2;

const JUMP_BACK_KIND_LABEL: Record<RecentItem['kind'], string> = {
  project: 'Project',
  task: 'Task',
  time: 'Time entry',
  note: 'Note',
  invoice: 'Invoice',
};

import { isUnbilledBillingStatus } from '@/lib/timeEntryBillingStatus';

function isUnbilledTimeEntry(e: { billable: boolean | null; billing_status: string | null }): boolean {
  if (e.billable === false) return false;
  return isUnbilledBillingStatus(e.billing_status);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

function dueText(dateStr: string | null | undefined): string {
  const d = daysUntil(dateStr);
  if (d === null) return 'No date';
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d}d`;
}

function buildHoursBuckets(range: HoursRangeKey): { start: Date; end: Date; label: string }[] {
  const base = startOfToday();
  const buckets: { start: Date; end: Date; label: string }[] = [];
  if (range === 'week') {
    for (let i = 7; i >= 0; i--) {
      const end = new Date(base);
      end.setDate(base.getDate() - i * 7 + 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 7);
      buckets.push({ start, end, label: format(start, 'd MMM') });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 1);
      buckets.push({ start, end, label: format(start, 'MMM') });
    }
  }
  return buckets;
}

function buildBuckets(range: RangeKey): { start: Date; end: Date; label: string }[] {
  const base = startOfToday();
  const buckets: { start: Date; end: Date; label: string }[] = [];
  if (range === 'day') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(base);
      start.setDate(base.getDate() - i);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      buckets.push({ start, end, label: format(start, 'EEE') });
    }
  } else if (range === 'week') {
    for (let i = 7; i >= 0; i--) {
      const end = new Date(base);
      end.setDate(base.getDate() - i * 7 + 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 7);
      buckets.push({ start, end, label: format(start, 'd MMM') });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 1);
      buckets.push({ start, end, label: format(start, 'MMM') });
    }
  }
  return buckets;
}

function MiniSparkline({ data, color = 'hsl(var(--primary))' }: { data: SparkPoint[]; color?: string }) {
  const safeData = (data || []).filter((point) => point && Number.isFinite(point.v));
  if (safeData.length < 2) return null;
  return (
    <ResponsiveContainer width={64} height={32}>
      <LineChart data={safeData}>
        <Line type="linear" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TrendChip({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
        up ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
      )}
    >
      {up ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      {Math.abs(pct)}%
    </span>
  );
}

function RangeToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: Dispatch<SetStateAction<T>>;
  options: { key: T; label: string }[];
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
            value === o.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CASH_RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const HOURS_RANGE_OPTIONS: { key: HoursRangeKey; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency: fmt } = useProfileCurrency();
  const { dateFormat } = useLocalePreferences();

  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    pendingInvoices: 0,
    pendingProposals: 0,
    pendingContracts: 0,
    pendingAmount: 0,
    hoursThisMonth: 0,
    unbilledHours: 0,
    unbilledAmount: 0,
    prevMonthHours: 0,
    collectedThisMonth: 0,
  });
  const [allProjects, setAllProjects] = useState<RecentProject[]>([]);
  const [projectTab, setProjectTab] = useState<ProjectTabKey>('active');
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [priorityItems, setPriorityItems] = useState<PriorityItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [hoursSparkline, setHoursSparkline] = useState<SparkPoint[]>([]);
  const [rawTimeEntries, setRawTimeEntries] = useState<RawTimeEntry[]>([]);
  const [rawInvoices, setRawInvoices] = useState<RawInvoice[]>([]);
  const [hoursRange, setHoursRange] = useState<HoursRangeKey>('week');
  const [cashRange, setCashRange] = useState<RangeKey>('week');
  const [loading, setLoading] = useState(true);

  const { data: shellProfile, isSuccess: profileReady } = useShellProfile(user?.id);
  const { canAccessNotes, canAccessContracts } = useFeatureAccess();

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const toHours = (e: { duration_minutes?: number | null; total_duration_seconds?: number | null }) =>
    e.total_duration_seconds != null ? e.total_duration_seconds / 3600 : (e.duration_minutes || 0) / 60;

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const soon = new Date(startOfToday());
      soon.setDate(soon.getDate() + SOON_DAYS);
      const soonStr = soon.toISOString().split('T')[0];
      const showContracts = getContractsAccessMode() === 'on';

      // ── Counts ────────────────────────────────────────────────────────────
      const [
        { count: projectsCount },
        { count: pendingInvoicesCount, data: sentInvoices },
        { count: pendingProposalsCount },
        { count: pendingContractsCount },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('invoices').select('total', { count: 'exact' }).in('status', ['sent', 'overdue', 'reminder_sent']),
        supabase.from('proposals').select('*', { count: 'exact', head: true }).in('status', ['sent', 'read']),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'pending_signatures'),
      ]);
      const pendingAmount = sentInvoices?.reduce((s, i) => s + (Number(i.total) || 0), 0) || 0;

      // ── Time entries (6 months) ────────────────────────────────────────────
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('duration_minutes, total_duration_seconds, billable, billing_status, start_time, started_at, hourly_rate')
        .or(`start_time.gte.${sixMonthsAgo.toISOString()},started_at.gte.${sixMonthsAgo.toISOString()}`);

      const rawTime: RawTimeEntry[] = (timeEntries || []).map((e) => ({
        start_time: e.start_time,
        started_at: e.started_at,
        hours: toHours(e),
        billable: e.billable,
        billing_status: e.billing_status,
        hourly_rate: e.hourly_rate,
      }));
      setRawTimeEntries(rawTime);

      const thisMonth = rawTime.filter((e) => {
        const entryDate = getTimeEntryDate(e);
        return entryDate ? entryDate >= startOfMonth : false;
      });
      const hoursThisMonth = thisMonth.reduce((s, e) => s + e.hours, 0);
      const unbilledEntries = thisMonth.filter(isUnbilledTimeEntry);
      const unbilledHours = unbilledEntries.reduce((s, e) => s + e.hours, 0);
      const unbilledAmount = unbilledEntries.reduce((s, e) => s + e.hours * (Number(e.hourly_rate) || 0), 0);
      const prevMonthHours = rawTime
        .filter((e) => {
          const entryDate = getTimeEntryDate(e);
          return entryDate ? entryDate >= startOfPrevMonth && entryDate <= endOfPrevMonth : false;
        })
        .reduce((s, e) => s + e.hours, 0);

      // Sparkline: last 4 weeks of hours
      const weekBuckets = [0, 0, 0, 0];
      thisMonth.forEach((e) => {
        const entryDate = getTimeEntryDate(e);
        if (!entryDate) return;
        const daysAgo = Math.floor((now.getTime() - entryDate.getTime()) / 86400000);
        const idx = 3 - Math.min(3, Math.floor(daysAgo / 7));
        weekBuckets[idx] += e.hours;
      });
      setHoursSparkline(weekBuckets.map((v) => ({ v: +v.toFixed(1) })));

      // ── Invoices (6 months for chart) ──────────────────────────────────────
      const { data: chartInvoices } = await supabase
        .from('invoices')
        .select('total, status, issue_date, paid_date, created_at')
        .gte('created_at', sixMonthsAgo.toISOString());
      const rawInv: RawInvoice[] = (chartInvoices || []).map((i) => ({
        total: Number(i.total) || 0,
        status: i.status,
        issue_date: i.issue_date,
        paid_date: i.paid_date,
        created_at: i.created_at,
      }));
      setRawInvoices(rawInv);

      const collectedThisMonth = rawInv
        .filter((i) => i.status === 'paid' && i.paid_date && new Date(i.paid_date) >= startOfMonth)
        .reduce((s, i) => s + i.total, 0);

      // ── Recent invoices list ───────────────────────────────────────────────
      const { data: invoices, count: invoicesTotalCount } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, status, due_date', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);
      setRecentInvoices((invoices as RecentInvoice[]) || []);
      setTotalInvoicesCount(invoicesTotalCount ?? 0);

      setStats({
        activeProjects: projectsCount || 0,
        pendingInvoices: pendingInvoicesCount ?? 0,
        pendingProposals: pendingProposalsCount ?? 0,
        pendingContracts: pendingContractsCount ?? 0,
        pendingAmount,
        hoursThisMonth,
        unbilledHours,
        unbilledAmount,
        prevMonthHours,
        collectedThisMonth,
      });

      // ── Projects (tabs) ────────────────────────────────────────────────────
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, due_date, clients(name)')
        .in('status', ['active', 'on_hold', 'completed'])
        .order('created_at', { ascending: false })
        .limit(30);

      const projectsWithTasks = await Promise.all(
        (projects || []).map(async (p) => {
          const [{ count: total }, { data: doneTasks }, { data: projectTime }] = await Promise.all([
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', p.id),
            supabase
              .from('tasks')
              .select('id, project_statuses!status_id(is_done_status)')
              .eq('project_id', p.id),
            supabase.from('time_entries').select('duration_minutes, total_duration_seconds').eq('project_id', p.id),
          ]);
          const completed = (doneTasks || []).filter(
            (t) => (t.project_statuses as { is_done_status?: boolean } | null)?.is_done_status === true,
          ).length;
          const hours = (projectTime || []).reduce((s, e) => s + toHours(e), 0);
          return {
            id: p.id,
            name: p.name,
            client_name: (p.clients as { name: string } | null)?.name || null,
            status: p.status,
            due_date: p.due_date,
            hours,
            task_count: total || 0,
            completed_tasks: completed,
          };
        }),
      );
      setAllProjects(projectsWithTasks);

      // ── Needs you today (smart aggregation) ────────────────────────────────
      const [
        { data: dueTasks },
        { data: sentInvoicesDue },
        { data: openProposals },
        { data: openContracts },
        { data: pendingReviews },
        { data: followUps },
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, due_date, project_id, projects(name), project_statuses!status_id(is_done_status)')
          .not('due_date', 'is', null)
          .lte('due_date', soonStr)
          .order('due_date', { ascending: true })
          .limit(15),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, due_date, clients(name)')
          .in('status', ['sent', 'overdue', 'reminder_sent'])
          .order('due_date', { ascending: true })
          .limit(10),
        supabase
          .from('proposals')
          .select('id, identifier, status, expires_at, client_name_snapshot, clients(name)')
          .in('status', ['sent', 'read'])
          .order('expires_at', { ascending: true, nullsFirst: false })
          .limit(10),
        showContracts
          ? supabase
              .from('contracts')
              .select('id, identifier, client_name, sent_at, timeline_days, clients(name)')
              .eq('status', 'pending_signatures')
              .order('sent_at', { ascending: true, nullsFirst: false })
              .limit(10)
          : Promise.resolve({ data: [] as unknown[] }),
        supabase
          .from('review_requests')
          .select('id, title, due_date')
          .eq('status', 'pending')
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(10),
        supabase
          .from('client_follow_ups')
          .select('id, client_id, title, due_at, clients!inner(name)')
          // Regression guard: keep explicit archived-client filter in dashboard flows.
          // .is('archived_at', null)
          .eq('user_id', user!.id)
          .is('completed_at', null)
          .is('clients.archived_at', null)
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(10),
      ]);

      const items: PriorityItem[] = [];

      (dueTasks || []).forEach((t) => {
        const isDone = (t.project_statuses as { is_done_status?: boolean } | null)?.is_done_status === true;
        if (isDone) return;
        const d = daysUntil(t.due_date);
        if (d === null || d > SOON_DAYS) return;
        const tone: PriorityItem['tone'] = d < 0 ? 'overdue' : 'soon';
        items.push({
          id: `task-${t.id}`,
          label: tone === 'overdue' ? 'Overdue task' : 'Task due',
          tone,
          category: 'delivery',
          title: t.title,
          subtitle: `${(t.projects as { name: string } | null)?.name || 'Project'} · ${dueText(t.due_date)}`,
          ctaLabel: 'Open task',
          to: `/projects/${t.project_id}`,
          rank: tone === 'overdue' ? 0 : 1,
          sortDate: t.due_date ? new Date(t.due_date).getTime() : Infinity,
        });
      });

      projectsWithTasks
        .filter((p) => p.status === 'active' && p.due_date)
        .forEach((p) => {
          const d = daysUntil(p.due_date);
          if (d === null || d > SOON_DAYS) return;
          const tone: PriorityItem['tone'] = d < 0 ? 'overdue' : 'soon';
          items.push({
            id: `project-${p.id}`,
            label: tone === 'overdue' ? 'Overdue project' : 'Project due',
            tone,
            category: 'delivery',
            title: p.name,
            subtitle: `${p.client_name || 'No client'} · ${dueText(p.due_date)}`,
            ctaLabel: 'Open project',
            to: `/projects/${p.id}`,
            rank: tone === 'overdue' ? 0 : 1,
            sortDate: p.due_date ? new Date(p.due_date).getTime() : Infinity,
          });
        });

      (sentInvoicesDue || []).forEach((inv) => {
        const d = daysUntil(inv.due_date);
        if (d === null || d > SOON_DAYS) return;
        const tone: PriorityItem['tone'] = d < 0 ? 'overdue' : 'soon';
        items.push({
          id: `invoice-${inv.id}`,
          label: tone === 'overdue' ? 'Overdue invoice' : 'Invoice due',
          tone,
          category: 'finance',
          title: `${inv.invoice_number} · ${fmt(Number(inv.total) || 0)}`,
          subtitle: `${(inv.clients as { name: string } | null)?.name || 'Client'} · ${dueText(inv.due_date)}`,
          ctaLabel: 'Send reminder',
          to: `/invoices/${inv.id}`,
          rank: tone === 'overdue' ? 0 : 1,
          sortDate: inv.due_date ? new Date(inv.due_date).getTime() : Infinity,
        });
      });

      if (unbilledHours > 0) {
        items.push({
          id: 'unbilled',
          label: 'Unbilled hours',
          tone: 'info',
          category: 'finance',
          title: `${unbilledHours.toFixed(1)}h ready to invoice`,
          subtitle: unbilledAmount > 0 ? `${fmt(unbilledAmount)} across projects` : 'Bill your tracked time',
          ctaLabel: 'Create invoice',
          to: '/invoices',
          rank: 2,
          sortDate: 0,
        });
      }

      (openProposals || []).forEach((p) => {
        const d = daysUntil(p.expires_at);
        if (d === null || d > SOON_DAYS) return;
        const tone: PriorityItem['tone'] = d < 0 ? 'overdue' : 'soon';
        const clientName =
          (p.clients as { name: string } | null)?.name || (p.client_name_snapshot as string | null) || 'Client';
        items.push({
          id: `proposal-${p.id}`,
          label: tone === 'overdue' ? 'Proposal expired' : 'Proposal expiring',
          tone,
          category: 'finance',
          title: `${p.identifier || 'Proposal'} — ${clientName}`,
          subtitle: d < 0 ? 'Expired' : dueText(p.expires_at),
          ctaLabel: 'Nudge client',
          to: `/proposals/${p.id}`,
          rank: tone === 'overdue' ? 0 : 1,
          sortDate: p.expires_at ? new Date(p.expires_at).getTime() : Infinity,
        });
      });

      ((openContracts as {
        id: string;
        identifier: string | null;
        client_name: string | null;
        sent_at: string | null;
        timeline_days: number | null;
        clients: { name: string } | null;
      }[]) || []).forEach((c) => {
        let contractDue: string | null = null;
        if (c.sent_at && c.timeline_days) {
          const expiry = new Date(c.sent_at);
          expiry.setDate(expiry.getDate() + c.timeline_days);
          contractDue = expiry.toISOString().split('T')[0];
        }
        const d = contractDue ? daysUntil(contractDue) : null;
        if (d !== null && d > SOON_DAYS) return;
        const tone: PriorityItem['tone'] = d !== null && d < 0 ? 'overdue' : 'soon';
        items.push({
          id: `contract-${c.id}`,
          label: 'Needs signature',
          tone,
          category: 'finance',
          title: `${c.identifier || 'Contract'} — ${c.clients?.name || c.client_name || 'Client'}`,
          subtitle: contractDue ? dueText(contractDue) : 'Pending signatures',
          ctaLabel: 'View contract',
          to: `/contracts/${c.id}`,
          rank: tone === 'overdue' ? 0 : 1,
          sortDate: contractDue ? new Date(contractDue).getTime() : 0,
        });
      });

      (pendingReviews || []).forEach((r) => {
        const d = daysUntil(r.due_date);
        if (d !== null && d > SOON_DAYS) return;
        const tone: PriorityItem['tone'] = d !== null && d < 0 ? 'overdue' : d !== null ? 'soon' : 'info';
        items.push({
          id: `review-${r.id}`,
          label: 'Awaiting approval',
          tone,
          category: 'approval',
          title: r.title || 'Approval request',
          subtitle: r.due_date ? dueText(r.due_date) : 'Pending client review',
          ctaLabel: 'Review',
          to: `/reviews/${r.id}`,
          rank: tone === 'overdue' ? 0 : tone === 'soon' ? 1 : 2,
          sortDate: r.due_date ? new Date(r.due_date).getTime() : Infinity,
        });
      });

      (followUps || []).forEach((f) => {
        const d = daysUntil(f.due_at);
        if (d !== null && d > SOON_DAYS) return;
        const tone: PriorityItem['tone'] = d !== null && d < 0 ? 'overdue' : d !== null ? 'soon' : 'info';
        items.push({
          id: `followup-${f.id}`,
          label: 'Follow-up',
          tone,
          category: 'crm',
          title: (f.clients as { name: string } | null)?.name || 'Client',
          subtitle: f.title + (f.due_at ? ` · ${dueText(f.due_at)}` : ''),
          ctaLabel: 'Open client',
          to: `/clients?open=${f.client_id}`,
          rank: tone === 'overdue' ? 0 : tone === 'soon' ? 1 : 2,
          sortDate: f.due_at ? new Date(f.due_at).getTime() : Infinity,
        });
      });

      items.sort((a, b) => a.rank - b.rank || a.sortDate - b.sortDate);
      setPriorityItems(items);

      // ── Recently edited items ──────────────────────────────────────────────
      const [
        { data: rProjects },
        { data: rTasks },
        { data: rTime },
        { data: rNotes },
        { data: rInvoices },
      ] = await Promise.all([
        supabase.from('projects').select('id, name, updated_at, clients(name)').order('updated_at', { ascending: false }).limit(4),
        supabase.from('tasks').select('id, title, project_id, updated_at, projects(name)').order('updated_at', { ascending: false }).limit(4),
        supabase
          .from('time_entries')
          .select('id, description, updated_at, start_time, projects(name), tasks(title)')
          .order('updated_at', { ascending: false })
          .limit(4),
        canAccessNotes
          ? supabase.from('notes').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(4)
          : Promise.resolve({ data: [] as unknown[] }),
        supabase.from('invoices').select('id, invoice_number, updated_at').order('updated_at', { ascending: false }).limit(4),
      ]);

      const recents: RecentItem[] = [];
      (rProjects || []).forEach((p) =>
        recents.push({
          id: `p-${p.id}`,
          kind: 'project',
          title: p.name,
          subtitle: (p.clients as { name: string } | null)?.name || JUMP_BACK_KIND_LABEL.project,
          updated_at: p.updated_at,
          to: `/projects/${p.id}`,
        }),
      );
      (rTasks || []).forEach((t) =>
        recents.push({
          id: `t-${t.id}`,
          kind: 'task',
          title: t.title,
          subtitle: (t.projects as { name: string } | null)?.name || JUMP_BACK_KIND_LABEL.task,
          updated_at: t.updated_at,
          to: `/projects/${t.project_id}`,
        }),
      );
      (rTime || []).forEach((t) => {
        const taskTitle = (t.tasks as { title: string } | null)?.title;
        const desc = t.description?.trim();
        const entryName =
          taskTitle ||
          (desc && desc.length <= 60 ? desc : desc ? `${desc.slice(0, 57)}…` : null) ||
          (t.projects as { name: string } | null)?.name ||
          'Untitled entry';
        recents.push({
          id: `tm-${t.id}`,
          kind: 'time',
          title: entryName,
          subtitle:
            (t.projects as { name: string } | null)?.name || JUMP_BACK_KIND_LABEL.time,
          updated_at: t.updated_at,
          to: `/time?edit=${t.id}&view=day`,
        });
      });
      ((rNotes as { id: string; title: string | null; updated_at: string }[]) || []).forEach((n) =>
        recents.push({
          id: `n-${n.id}`,
          kind: 'note',
          title: n.title || 'Untitled note',
          subtitle: JUMP_BACK_KIND_LABEL.note,
          updated_at: n.updated_at,
          to: '/notes',
        }),
      );
      (rInvoices || []).forEach((inv) =>
        recents.push({
          id: `i-${inv.id}`,
          kind: 'invoice',
          title: inv.invoice_number,
          subtitle: JUMP_BACK_KIND_LABEL.invoice,
          updated_at: inv.updated_at,
          to: `/invoices/${inv.id}`,
        }),
      );
      recents.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setRecentItems(recents.slice(0, 6));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const isOverdue = (dateStr: string | null) => {
    const d = daysUntil(dateStr);
    return d !== null && d < 0;
  };

  // ── Derived chart data ────────────────────────────────────────────────────
  const hoursSeries = useMemo(() => {
    const buckets = buildHoursBuckets(hoursRange);
    return buckets.map((b) => {
      const value = rawTimeEntries.reduce((s, e) => {
        const t = getTimeEntryDate(e);
        if (!t) return s;
        return t >= b.start && t < b.end ? s + e.hours : s;
      }, 0);
      return { label: b.label, hours: +value.toFixed(1) };
    });
  }, [rawTimeEntries, hoursRange]);

  const hoursCurrentPeriod = useMemo(() => {
    const currentBucket = hoursSeries[hoursSeries.length - 1];
    return currentBucket?.hours ?? 0;
  }, [hoursSeries]);

  const cashSeries = useMemo(() => {
    const buckets = buildBuckets(cashRange);
    return buckets.map((b) => {
      let billed = 0;
      let paid = 0;
      rawInvoices.forEach((inv) => {
        const issued = new Date(inv.issue_date || inv.created_at);
        if (issued >= b.start && issued < b.end) billed += inv.total;
        if (inv.status === 'paid' && inv.paid_date) {
          const pd = new Date(inv.paid_date);
          if (pd >= b.start && pd < b.end) paid += inv.total;
        }
      });
      return { label: b.label, billed: +billed.toFixed(2), paid: +paid.toFixed(2) };
    });
  }, [rawInvoices, cashRange]);

  const cashTotals = useMemo(
    () => ({
      paid: cashSeries.reduce((s, p) => s + p.paid, 0),
      billed: cashSeries.reduce((s, p) => s + p.billed, 0),
    }),
    [cashSeries],
  );

  const safeCashSeries = useMemo(
    () =>
      cashSeries.filter(
        (point) =>
          point &&
          typeof point.label === 'string' &&
          Number.isFinite(point.billed) &&
          Number.isFinite(point.paid),
      ),
    [cashSeries],
  );

  const safeHoursSeries = useMemo(
    () =>
      hoursSeries.filter(
        (point) => point && typeof point.label === 'string' && Number.isFinite(point.hours),
      ),
    [hoursSeries],
  );

  const displayName = profileReady ? shellProfileDisplayName(shellProfile) : null;
  const firstName = displayName?.split(' ')[0] ?? null;
  const showContracts = canAccessContracts;
  const showNotes = canAccessNotes;

  const quickActions = [
    { label: 'Add client', slot: 'sidebar_clients' as IconSlotKey, to: '/clients?new=1' },
    { label: 'Add project', slot: 'sidebar_projects' as IconSlotKey, to: '/projects?new=1' },
    { label: 'Track time', slot: 'sidebar_time' as IconSlotKey, to: '/time/timer' },
    ...(showNotes ? [{ label: 'New note', slot: 'sidebar_notes' as IconSlotKey, to: '/notes' }] : []),
    { label: 'New proposal', slot: 'sidebar_proposals' as IconSlotKey, to: '/proposals' },
    { label: 'New approval', slot: 'sidebar_reviews' as IconSlotKey, to: '/reviews' },
  ];

  const filteredProjects = allProjects.filter((p) => p.status === projectTab);
  const dashboardPageOpts = { defaultPageSize: DASHBOARD_PAGE_SIZE, pageSizeOptions: [DASHBOARD_PAGE_SIZE] as const };
  const projectsPagination = usePagination(filteredProjects, dashboardPageOpts);
  const filteredPriorityItems = useMemo(
    () => priorityItems.filter((item) => matchesPriorityFilter(item, priorityFilter)),
    [priorityItems, priorityFilter],
  );

  const priorityFilterCounts = useMemo(
    () => ({
      all: priorityItems.length,
      overdue: priorityItems.filter((item) => matchesPriorityFilter(item, 'overdue')).length,
      due_soon: priorityItems.filter((item) => matchesPriorityFilter(item, 'due_soon')).length,
      finance: priorityItems.filter((item) => matchesPriorityFilter(item, 'finance')).length,
    }),
    [priorityItems],
  );

  const priorityPagination = usePagination(filteredPriorityItems, dashboardPageOpts);
  const recentInvoicesPagination = usePagination(recentInvoices, dashboardPageOpts);
  const projectTabCounts = {
    active: allProjects.filter((p) => p.status === 'active').length,
    on_hold: allProjects.filter((p) => p.status === 'on_hold').length,
    completed: allProjects.filter((p) => p.status === 'completed').length,
  };

  const statCards = [
    { title: 'Active projects', value: String(stats.activeProjects), subtitle: `${stats.activeProjects} total`, hideDot: true, spark: null as SparkPoint[] | null, trend: null as { current: number; prev: number } | null, to: '/projects' },
    { title: 'Hours this month', value: stats.hoursThisMonth.toFixed(1) + 'h', subtitle: `${stats.unbilledHours.toFixed(1)}h unbilled`, hideDot: true, spark: hoursSparkline, trend: { current: stats.hoursThisMonth, prev: stats.prevMonthHours }, to: '/time?view=month' },
    { title: 'Pending payment', value: fmt(stats.pendingAmount), subtitle: `${stats.pendingInvoices} invoice${stats.pendingInvoices === 1 ? '' : 's'} out`, dotClassName: 'bg-amber-500', spark: null, trend: null, to: '/invoices' },
    { title: 'Pending proposals', value: String(stats.pendingProposals), subtitle: 'sent + read', status: 'sent', spark: null, trend: null, to: '/proposals' },
    ...(showContracts
      ? [{ title: 'Pending signatures', value: String(stats.pendingContracts), subtitle: 'awaiting signature', status: 'pending_signatures', spark: null as SparkPoint[] | null, trend: null as { current: number; prev: number } | null, to: '/contracts' }]
      : []),
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-lg lg:col-span-2" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
          <Skeleton className="h-72 rounded-lg" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-lg" />
            <Skeleton className="h-56 rounded-lg" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              {getGreeting()}
              {firstName ? <>, {firstName}!</> : <>!</>}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {priorityItems.length > 0
                ? `You have ${priorityItems.length} item${priorityItems.length > 1 ? 's' : ''} that need your attention.`
                : "You're all caught up. Here's your business overview."}
            </p>
          </div>
          <div className="flex shrink-0 justify-start gap-2 sm:justify-end">
            <Button variant="outline" size="sm" asChild>
              <Link to="/time">
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/projects?new=1">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'grid gap-4 sm:grid-cols-2',
            statCards.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
          )}
        >
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className="cursor-pointer border-0 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => navigate(stat.to)}
            >
              <CardContent className="p-4 sm:p-5">
                <PageSummaryStat
                  label={stat.title}
                  value={stat.value}
                  subtitle={
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {stat.subtitle}
                      {stat.trend ? (
                        <TrendChip current={stat.trend.current} prev={stat.trend.prev} />
                      ) : null}
                    </span>
                  }
                  hideDot={stat.hideDot}
                  status={'status' in stat ? (stat as { status?: string }).status : undefined}
                  dotClassName={
                    'dotClassName' in stat ? (stat as { dotClassName?: string }).dotClassName : undefined
                  }
                  trailing={
                    stat.spark && stat.spark.length >= 2 ? (
                      <div className="opacity-70">
                        <MiniSparkline data={stat.spark} />
                      </div>
                    ) : undefined
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Needs you today + This month ───────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base font-semibold">
                  Needs you today
                  {filteredPriorityItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {filteredPriorityItems.length}
                    </Badge>
                  )}
                </CardTitle>
                {priorityItems.length > 0 ? (
                  <div className="flex w-full flex-wrap items-center justify-start gap-1 sm:ml-auto sm:w-auto sm:justify-end">
                    {PRIORITY_FILTERS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPriorityFilter(key)}
                        className={cn(
                          'inline-flex min-w-0 items-center rounded-md px-2 py-1 text-[11px] font-medium leading-none transition-colors sm:px-2.5 sm:text-xs',
                          priorityFilter === key
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <span className="truncate">{PRIORITY_FILTER_LABELS[key]}</span>
                        <span
                          className={cn(
                            'ml-1 rounded-full px-1 py-0.5 text-[9px] leading-none sm:ml-1.5 sm:text-[10px]',
                            priorityFilter === key ? 'bg-white/20' : 'bg-muted',
                          )}
                        >
                          {priorityFilterCounts[key]}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {priorityItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <CheckCircle className="mb-2 h-8 w-8 text-success/60" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="mt-0.5 text-xs">Nothing overdue or awaiting action.</p>
                </div>
              ) : filteredPriorityItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <p className="text-sm font-medium">
                    Nothing in {PRIORITY_FILTER_LABELS[priorityFilter].toLowerCase()}
                  </p>
                  <p className="mt-0.5 text-xs">Try another tab above.</p>
                </div>
              ) : (
                <>
                <div className="divide-y">
                  {priorityPagination.paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[8.5rem_minmax(0,1fr)_7.5rem] items-center gap-x-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="w-[8.5rem]">
                        <span
                          className={cn(
                            'inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                            TONE_STYLES[item.tone],
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <Button variant="outline" size="xs" asChild className="w-full shrink-0 justify-center">
                        <Link to={item.to}>{item.ctaLabel}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
                <TablePagination
                  total={priorityPagination.total}
                  page={priorityPagination.page}
                  pageSize={priorityPagination.pageSize}
                  from={priorityPagination.from}
                  to={priorityPagination.to}
                  showPageSizeSelect={false}
                  onPageChange={priorityPagination.setPage}
                  onPageSizeChange={priorityPagination.setPageSize}
                  className="border-t-0 px-0 pt-3"
                />
                </>
              )}
            </CardContent>
          </Card>

          {/* This month */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">This month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-2xl font-bold text-foreground">{fmt(stats.collectedThisMonth)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold text-muted-foreground">{fmt(stats.pendingAmount)}</p>
                  {stats.unbilledHours > 0 && (
                    <p className="text-xs font-medium text-primary">{stats.unbilledHours.toFixed(1)}h unbilled</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.pendingInvoices} invoice{stats.pendingInvoices !== 1 ? 's' : ''} out</span>
                  <span>{stats.pendingProposals} proposal{stats.pendingProposals !== 1 ? 's' : ''} pending</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width:
                        stats.collectedThisMonth + stats.pendingAmount > 0
                          ? `${Math.min(100, (stats.collectedThisMonth / (stats.collectedThisMonth + stats.pendingAmount)) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" /> Collected
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Outstanding
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" asChild className="w-full text-xs">
                  <Link to="/invoices">Invoices</Link>
                </Button>
                <Button size="sm" variant="outline" asChild className="w-full text-xs">
                  <Link to="/time/timer">Timer</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Projects with tabs ─────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-0">
            <div className="flex items-center gap-4">
              <CardTitle className="text-base font-semibold">Projects</CardTitle>
              <div className="flex gap-1">
                {(['active', 'on_hold', 'completed'] as ProjectTabKey[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProjectTab(tab)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      projectTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {tab === 'active' ? 'Active' : tab === 'on_hold' ? 'On hold' : 'Done'}
                    <span className={cn('ml-1.5 rounded-full px-1 py-0.5 text-[10px]', projectTab === tab ? 'bg-white/20' : 'bg-muted')}>
                      {projectTabCounts[tab]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/projects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No {projectTab === 'on_hold' ? 'on-hold' : projectTab === 'completed' ? 'completed' : 'active'} projects</p>
                {projectTab === 'active' && (
                  <Button asChild className="mt-3" variant="outline" size="sm">
                    <Link to="/projects?new=1">Create your first project</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                <div className="hidden gap-x-8 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(160px,1.25fr)_minmax(88px,auto)_96px_32px]">
                  <span>Project</span>
                  <span>Progress</span>
                  <span>Hours</span>
                  <span>Due</span>
                  <span />
                </div>
                {projectsPagination.paginatedItems.map((project) => {
                  const progressPct = project.task_count > 0 ? Math.round((project.completed_tasks / project.task_count) * 100) : 0;
                  const overdue = isOverdue(project.due_date);
                  return (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="group/row -mx-2 grid grid-cols-1 items-center gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_minmax(160px,1.25fr)_minmax(88px,auto)_96px_32px] sm:gap-x-8 sm:gap-y-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{project.client_name || 'No client'}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{progressPct}%</span>
                          <span>{project.completed_tasks}/{project.task_count} tasks</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                      <div className="text-sm font-medium text-foreground">{project.hours.toFixed(1)}h</div>
                      <div className={cn('text-xs font-medium', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                        {project.due_date ? formatLocaleDate(project.due_date, dateFormat) : <EmptyValue variant="table" />}
                      </div>
                      <div className="hidden justify-end sm:flex">
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover/row:text-primary" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {filteredProjects.length > 0 && (
              <TablePagination
                total={projectsPagination.total}
                page={projectsPagination.page}
                pageSize={projectsPagination.pageSize}
                from={projectsPagination.from}
                to={projectsPagination.to}
                showPageSizeSelect={false}
                onPageChange={projectsPagination.setPage}
                onPageSizeChange={projectsPagination.setPageSize}
                className="mt-2 border-t-0 px-0"
              />
            )}
          </CardContent>
        </Card>

        {/* ── Cash flow + Hours ──────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cash flow */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Cash flow</CardTitle>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-success" /> Paid
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Billed
                  </span>
                </div>
              </div>
              <RangeToggle value={cashRange} onChange={setCashRange} options={CASH_RANGE_OPTIONS} />
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid</p>
                  <p className="text-lg font-bold text-success">{fmt(cashTotals.paid)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Billed</p>
                  <p className="text-lg font-bold text-foreground">{fmt(cashTotals.billed)}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={safeCashSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cfBilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    formatter={(value: number, name: string) => [fmt(value), name === 'paid' ? 'Paid' : 'Billed']}
                  />
                  <Area type="linear" dataKey="billed" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#cfBilled)" isAnimationActive={false} connectNulls />
                  <Area type="linear" dataKey="paid" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#cfPaid)" isAnimationActive={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hours */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Hours tracked</CardTitle>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {hoursCurrentPeriod.toFixed(1)}h{' '}
                  <span className="text-xs font-normal text-muted-foreground">this {hoursRange}</span>
                </p>
              </div>
              <RangeToggle value={hoursRange} onChange={setHoursRange} options={HOURS_RANGE_OPTIONS} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={172}>
                <BarChart data={safeHoursSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    contentStyle={{ fontSize: 11, border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    formatter={(value: number) => [`${value}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── Recent items + Invoices + Notifications ────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recently edited */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Jump back in</CardTitle>
            </CardHeader>
            <CardContent>
              {recentItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing edited recently</p>
              ) : (
                <div className="space-y-1">
                  {recentItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.to}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <RecentItemIcon kind={item.kind} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.subtitle} · {getTimeAgo(new Date(item.updated_at))}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent invoices */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-primary">
                <Link to="/invoices">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet</p>
              ) : (
                <>
                <div className="space-y-1">
                  {recentInvoicesPagination.paginatedItems.map((invoice) => (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">{fmt(Number(invoice.total ?? 0))}</p>
                        </div>
                      </div>
                      <TableStatusBadge status={invoice.status} className="shrink-0" />
                    </Link>
                  ))}
                </div>
                <TablePagination
                  total={recentInvoicesPagination.total}
                  page={recentInvoicesPagination.page}
                  pageSize={recentInvoicesPagination.pageSize}
                  from={recentInvoicesPagination.from}
                  to={recentInvoicesPagination.to}
                  showPageSizeSelect={false}
                  onPageChange={recentInvoicesPagination.setPage}
                  onPageSizeChange={recentInvoicesPagination.setPageSize}
                  className="border-t-0 px-0 pt-3"
                />
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/50 hover:shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <SlotIcon slot={action.slot} className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
