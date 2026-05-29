import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export type TableComparator<T> = (a: T, b: T) => number;

export type TableSortState = {
  sortKey: string | null;
  sortDir: SortDirection;
  onSort: (key: string) => void;
};

/**
 * Sort filtered list items before pagination. When sortKey is null, order is unchanged.
 */
export function useTableSort<T>(
  items: T[],
  comparators: Record<string, TableComparator<T>>,
): TableSortState & { sortedItems: T[] } {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const onSort = useCallback(
    (key: string) => {
      if (!comparators[key]) return;
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey, comparators],
  );

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const cmp = comparators[sortKey];
    if (!cmp) return items;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => mult * cmp(a, b));
  }, [items, sortKey, sortDir, comparators]);

  return { sortedItems, sortKey, sortDir, onSort };
}
