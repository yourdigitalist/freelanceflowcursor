import { cn } from '@/lib/utils';

export function formatDuration(totalSeconds: number, includeSeconds = false): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (!includeSeconds) return `${hours}:${minutes.toString().padStart(2, '0')}`;
  const seconds = safeSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Month calendar cell: today gets a light highlight; logged hours use blue text only. */
export function timeMonthCalendarDayClassName(opts: {
  inMonth: boolean;
  totalSeconds: number;
  isSelected: boolean;
  isToday?: boolean;
}): string {
  const { inMonth, isSelected, isToday = false } = opts;

  return cn(
    'rounded-md border min-h-[88px] p-2 text-left transition-colors hover:bg-muted/50',
    inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
    isToday && !isSelected && 'border-primary/40 bg-primary/5',
    isSelected && 'border-border bg-muted/40 ring-1 ring-border',
  );
}

export function timeMonthCalendarDurationClassName(hasEntries: boolean): string {
  return cn(
    'text-xs font-mono mt-2',
    hasEntries
      ? 'font-semibold text-blue-600 dark:text-blue-400'
      : 'text-muted-foreground',
  );
}

/** Sum seconds from per-day totals (keys yyyy-MM-dd) within [monthStart, monthEnd]. */
export function sumMonthSecondsFromDayTotals(
  dayTotals: Record<string, number>,
  monthStart: Date,
  monthEnd: Date,
): number {
  return Object.entries(dayTotals).reduce((sum, [key, seconds]) => {
    const d = new Date(`${key}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d < monthStart || d > monthEnd) return sum;
    return sum + seconds;
  }, 0);
}
