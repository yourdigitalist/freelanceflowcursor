import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns';

export type TimeframeFilter = 'all' | 'today' | 'week' | 'month' | 'last30';
export type DateRangePreset = 'all' | 'this_week' | 'this_month' | 'last_6_months' | 'ytd' | 'custom';
export type StatusFilter = 'all' | 'unbilled' | 'invoiced' | 'billed' | 'paid' | 'not_billable';

export interface TimeEntryFilterable {
  started_at?: string | null;
  start_time: string;
  project_id: string | null;
  task_id: string | null;
  billable: boolean;
  billing_status: string | null;
  projects?: { client_id: string | null } | null;
}

export interface TimeEntryFilterState {
  projectFilter: string;
  clientFilter: string;
  taskFilter: string;
  statusFilter: StatusFilter;
  /** @deprecated Use dateRangePreset for All logs */
  timeframeFilter?: TimeframeFilter;
  dateRangePreset?: DateRangePreset;
  dateFrom?: string;
  dateTo?: string;
}

function entryMatchesDateRange(
  entryDate: Date,
  preset: DateRangePreset,
  dateFrom?: string,
  dateTo?: string,
): boolean {
  if (preset === 'all') return true;

  const now = new Date();

  switch (preset) {
    case 'this_week':
      return entryDate >= startOfWeek(now, { weekStartsOn: 1 }) && entryDate <= endOfWeek(now, { weekStartsOn: 1 });
    case 'this_month':
      return entryDate >= startOfMonth(now) && entryDate <= endOfMonth(now);
    case 'last_6_months':
      return entryDate >= subMonths(now, 6);
    case 'ytd':
      return entryDate >= startOfYear(now) && entryDate <= now;
    case 'custom': {
      if (dateFrom) {
        const from = parseISO(dateFrom);
        if (entryDate < from) return false;
      }
      if (dateTo) {
        const to = parseISO(`${dateTo}T23:59:59.999`);
        if (entryDate > to) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

/** @deprecated Use entryMatchesDateRange */
function entryMatchesTimeframe(entryDate: Date, timeframeFilter: TimeframeFilter): boolean {
  if (timeframeFilter === 'all') return true;
  const now = new Date();
  switch (timeframeFilter) {
    case 'today':
      return format(entryDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    case 'week':
      return entryDate >= startOfWeek(now, { weekStartsOn: 1 }) && entryDate <= endOfWeek(now, { weekStartsOn: 1 });
    case 'month':
      return entryDate >= startOfMonth(now) && entryDate <= endOfMonth(now);
    case 'last30':
      return entryDate >= subMonths(now, 1);
    default:
      return true;
  }
}

export function applyTimeEntryFilters<T extends TimeEntryFilterable>(
  entries: T[],
  filters: TimeEntryFilterState,
): T[] {
  const {
    projectFilter,
    clientFilter,
    taskFilter,
    statusFilter,
    timeframeFilter = 'all',
    dateRangePreset = 'all',
    dateFrom,
    dateTo,
  } = filters;

  return entries.filter((entry) => {
    const entryDate = parseISO(entry.started_at || entry.start_time);

    if (dateRangePreset !== 'all') {
      if (!entryMatchesDateRange(entryDate, dateRangePreset, dateFrom, dateTo)) return false;
    } else if (timeframeFilter !== 'all') {
      if (!entryMatchesTimeframe(entryDate, timeframeFilter)) return false;
    }

    if (projectFilter !== 'all' && entry.project_id !== projectFilter) return false;
    if (clientFilter !== 'all' && entry.projects?.client_id !== clientFilter) return false;
    if (taskFilter !== 'all' && entry.task_id !== taskFilter) return false;

    if (statusFilter !== 'all') {
      if (statusFilter === 'not_billable' && entry.billable) return false;
      if (statusFilter === 'unbilled' && (entry.billing_status !== 'unbilled' || !entry.billable)) return false;
      if (statusFilter === 'invoiced' && entry.billing_status !== 'invoiced') return false;
      if (statusFilter === 'billed' && entry.billing_status !== 'billed') return false;
      if (statusFilter === 'paid' && entry.billing_status !== 'paid') return false;
    }

    return true;
  });
}

export function getEntryClientName(
  entry: { projects?: { client_id: string | null } | null },
  clientById: Map<string, { name: string }>,
): string | null {
  const clientId = entry.projects?.client_id;
  if (!clientId) return null;
  return clientById.get(clientId)?.name ?? null;
}

export function getDateRangeForPreset(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'this_week':
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    case 'this_month':
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'last_6_months':
      return {
        from: format(subMonths(now, 6), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd'),
      };
    case 'ytd':
      return {
        from: format(startOfYear(now), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd'),
      };
    default:
      return { from: '', to: '' };
  }
}
