import { ChevronLeft, ChevronRight } from '@/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type TablePaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  from: number;
  to: number;
  pageSizeOptions?: readonly number[];
  showPageSizeSelect?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function TablePagination({
  total,
  page,
  pageSize,
  from,
  to,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelect = true,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div
      className={cn(
        'mt-auto flex shrink-0 items-center justify-between border-t border-border/60 px-4 py-2',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showPageSizeSelect && pageSizeOptions.length > 1 ? (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-6 w-[3.25rem] border-0 bg-transparent px-1 text-xs text-muted-foreground shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <span className="text-xs tabular-nums text-muted-foreground">
          {from}-{to} of {total}
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
