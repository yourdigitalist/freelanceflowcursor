import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from 'date-fns';

export type TimeframeFilter = 'all' | 'today' | 'week' | 'month' | 'last30';
export type StatusFilter = 'all' | 'unbilled' | 'billed' | 'paid' | 'not_billable';

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
  timeframeFilter?: TimeframeFilter;
}

export function applyTimeEntryFilters<T extends TimeEntryFilterable>(
  entries: T[],
  filters: TimeEntryFilterState,
): T[] {
  const { projectFilter, clientFilter, taskFilter, statusFilter, timeframeFilter = 'all' } = filters;

  return entries.filter((entry) => {
    if (timeframeFilter !== 'all') {
      const entryDate = parseISO(entry.started_at || entry.start_time);
      const now = new Date();

      switch (timeframeFilter) {
        case 'today':
          if (format(entryDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) return false;
          break;
        case 'week':
          if (entryDate < startOfWeek(now) || entryDate > endOfWeek(now)) return false;
          break;
        case 'month':
          if (entryDate < startOfMonth(now) || entryDate > endOfMonth(now)) return false;
          break;
        case 'last30':
          if (entryDate < subDays(now, 30)) return false;
          break;
      }
    }

    if (projectFilter !== 'all' && entry.project_id !== projectFilter) return false;
    if (clientFilter !== 'all' && entry.projects?.client_id !== clientFilter) return false;
    if (taskFilter !== 'all' && entry.task_id !== taskFilter) return false;

    if (statusFilter !== 'all') {
      if (statusFilter === 'not_billable' && entry.billable) return false;
      if (statusFilter === 'unbilled' && (entry.billing_status !== 'unbilled' || !entry.billable)) return false;
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
