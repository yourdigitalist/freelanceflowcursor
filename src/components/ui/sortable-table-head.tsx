import { ChevronDown, ChevronUp } from '@/components/icons';
import { TableHead } from '@/components/ui/table';
import type { SortDirection, TableSortState } from '@/hooks/useTableSort';
import { cn } from '@/lib/utils';

type SortableTableHeadProps = {
  label: string;
  sortKey: string;
  sort: TableSortState;
  className?: string;
  align?: 'left' | 'right';
};

export function SortableTableHead({
  label,
  sortKey,
  sort,
  className,
  align = 'left',
}: SortableTableHeadProps) {
  const isActive = sort.sortKey === sortKey;

  return (
    <TableHead className={cn('group/col p-0', className)}>
      <button
        type="button"
        onClick={() => sort.onSort(sortKey)}
        className={cn(
          'flex h-9 w-full items-center gap-0.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
          align === 'right' ? 'justify-end text-right' : 'text-left',
        )}
        aria-sort={
          isActive ? (sort.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        <span className="truncate">{label}</span>
        <SortChevrons active={isActive} direction={sort.sortDir} />
      </button>
    </TableHead>
  );
}

function SortChevrons({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  return (
    <span
      className={cn(
        'ml-0.5 inline-flex shrink-0 flex-col opacity-0 transition-opacity group-hover/col:opacity-70',
        active && 'opacity-100',
      )}
      aria-hidden
    >
      <ChevronUp
        className={cn(
          'h-3 w-3',
          active && direction === 'asc' ? 'text-foreground' : 'text-muted-foreground/40',
        )}
      />
      <ChevronDown
        className={cn(
          '-mt-1 h-3 w-3',
          active && direction === 'desc' ? 'text-foreground' : 'text-muted-foreground/40',
        )}
      />
    </span>
  );
}
