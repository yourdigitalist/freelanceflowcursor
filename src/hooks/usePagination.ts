import { useEffect, useMemo, useState } from 'react';

export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DASHBOARD_PAGE_SIZE = 5;

export type UsePaginationOptions = {
  defaultPageSize?: number;
  pageSizeOptions?: readonly number[];
};

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const pageSizeOptions = options.pageSizeOptions ?? TABLE_PAGE_SIZE_OPTIONS;
  const defaultPageSize = options.defaultPageSize ?? pageSizeOptions[0] ?? 10;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return {
    paginatedItems,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    from,
    to,
    pageSizeOptions,
    showPageSizeSelect: pageSizeOptions.length > 1,
  };
}
