import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { emptyDisplayText } from '@/lib/emptyDisplay';

export type ProjectActivityKey = 'no_activity' | 'active';

export type ProjectActivity = {
  key: ProjectActivityKey;
  label: string;
  dotClass: string;
  badgeClass: string;
};

const ACTIVITY_STYLES: Record<ProjectActivityKey, Pick<ProjectActivity, 'dotClass' | 'badgeClass'>> = {
  no_activity: {
    dotClass: 'bg-neutral-400',
    badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  },
  active: {
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
};

export function getProjectDbStatusLabel(status: string | null | undefined): string | null {
  switch ((status || '').toLowerCase()) {
    case 'on_hold':
      return 'On hold';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return null;
  }
}

export function getProjectActivity(input: {
  task_count: number;
  status: string | null | undefined;
}): ProjectActivity {
  const dbLabel = getProjectDbStatusLabel(input.status);
  if (dbLabel) {
    const key: ProjectActivityKey = 'no_activity';
    return { key, label: dbLabel, ...ACTIVITY_STYLES[key] };
  }

  if (input.task_count <= 0) {
    return { key: 'no_activity', label: 'No activity', ...ACTIVITY_STYLES.no_activity };
  }
  return { key: 'active', label: 'Active', ...ACTIVITY_STYLES.active };
}

export function getProjectTaskProgressPercent(
  completedTasks: number,
  taskCount: number,
): number {
  if (taskCount <= 0) return 0;
  return Math.round((completedTasks / taskCount) * 100);
}

export function formatProjectHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}

export type ProjectDueTone = 'normal' | 'soon' | 'overdue';

export function formatProjectDueLabel(
  dueDate: string | null | undefined,
  dateFormat?: string,
): { label: string; tone: ProjectDueTone } {
  if (!dueDate) {
    return { label: 'Ongoing', tone: 'normal' };
  }
  try {
    const d = parseISO(dueDate.length > 10 ? dueDate : `${dueDate}T12:00:00`);
    const days = differenceInCalendarDays(d, new Date());
    const label = dateFormat === 'US' ? format(d, 'MMM d') : format(d, 'd MMM');
    if (days < 0) return { label, tone: 'overdue' };
    if (days <= 7) return { label, tone: 'soon' };
    return { label, tone: 'normal' };
  } catch {
    return { label: emptyDisplayText({ variant: 'table', dash: true }), tone: 'normal' };
  }
}

/** Matches dashboard “Project due” tag (warning), not brown amber tones. */
export function projectDueToneClass(tone: ProjectDueTone): string {
  switch (tone) {
    case 'overdue':
    case 'soon':
      return 'text-warning';
    default:
      return 'text-foreground';
  }
}

export function formatProjectValue(
  budget: number | null | undefined,
  formatMoney: (amount: number) => string,
): string {
  if (budget == null) return emptyDisplayText({ variant: 'table', dash: true });
  return formatMoney(budget);
}
