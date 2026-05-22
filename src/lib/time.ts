import { cn } from '@/lib/utils';

export function formatDuration(totalSeconds: number, includeSeconds = false): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (!includeSeconds) return `${hours}:${minutes.toString().padStart(2, '0')}`;
  const seconds = safeSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Month calendar cell: highlight days with logged time vs empty days. */
export function timeMonthCalendarDayClassName(opts: {
  inMonth: boolean;
  totalSeconds: number;
  isSelected: boolean;
  isToday?: boolean;
}): string {
  const { inMonth, totalSeconds, isSelected, isToday = false } = opts;
  const hasEntries = totalSeconds > 0;

  return cn(
    'rounded-md border min-h-[88px] p-2 text-left transition-colors hover:bg-muted/50',
    inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
    hasEntries && inMonth && !isSelected && 'border-primary/50 bg-primary/5',
    isToday && !isSelected && !hasEntries && 'border-primary/40 bg-primary/5',
    isSelected && 'border-primary bg-primary/10 ring-1 ring-primary/30',
  );
}

export function timeMonthCalendarDurationClassName(hasEntries: boolean): string {
  return cn(
    'text-xs font-mono mt-2',
    hasEntries ? 'font-semibold text-foreground' : 'text-muted-foreground',
  );
}
