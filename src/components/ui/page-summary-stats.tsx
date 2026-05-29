import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getTableStatusBadgeStyles } from '@/lib/statusDisplay';
import { cn } from '@/lib/utils';

export type PageSummaryStatProps = {
  label: string;
  value: string;
  subtitle?: React.ReactNode;
  /** Maps to status dot color (same palette as table badges). */
  status?: string | null;
  /** Override dot color when `status` is not used. */
  dotClassName?: string;
  /** Label rows without a status dot (e.g. totals). */
  hideDot?: boolean;
  className?: string;
  valueClassName?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
};

function resolveDotClass(status?: string | null, dotClassName?: string) {
  if (dotClassName) return dotClassName;
  if (status) return getTableStatusBadgeStyles(status).dot;
  return 'bg-muted-foreground/40';
}

function isMutedValue(value: string) {
  const n = Number(value.replace(/[^0-9.-]+/g, ''));
  if (!Number.isNaN(n) && n === 0) return true;
  return value === '0' || value === '0h' || value === '0.0h';
}

export function PageSummaryStat({
  label,
  value,
  subtitle,
  status,
  dotClassName,
  hideDot = false,
  className,
  valueClassName,
  trailing,
  onClick,
}: PageSummaryStatProps) {
  const dot = resolveDotClass(status, dotClassName);
  const muted = isMutedValue(value);

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {!hideDot ? (
              <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
            ) : null}
            <span className="truncate">{label}</span>
          </div>
          <p
            className={cn(
              'mt-1 text-xl font-bold tracking-tight',
              muted ? 'text-muted-foreground' : 'text-foreground',
              valueClassName,
            )}
          >
            {value}
          </p>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'min-w-0 rounded-lg text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return <div className={cn('min-w-0', className)}>{inner}</div>;
}

const columnClasses: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
};

export type PageSummaryBarProps = {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
};

export function PageSummaryBar({ children, columns = 4, className }: PageSummaryBarProps) {
  const colClass = columnClasses[columns] ?? columnClasses[4];
  return (
    <div className={cn('grid gap-4', colClass, className)}>
      {React.Children.map(children, (child) =>
        child != null && child !== false ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">{child}</CardContent>
          </Card>
        ) : null,
      )}
    </div>
  );
}
