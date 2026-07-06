import { endOfMonth, format, isSameMonth, parseISO, startOfMonth } from 'date-fns';

/** Label for a single-line time import, e.g. "Billable hours May 2026". */
export function formatImportTimeframeLabel(fromDate: string, toDate: string): string {
  if (!fromDate && !toDate) {
    return 'Billable hours';
  }

  const from = fromDate ? parseISO(fromDate) : null;
  const to = toDate ? parseISO(toDate) : from;

  if (!from && to) {
    return `Billable hours ${format(to, 'MMMM yyyy')}`;
  }
  if (from && !to) {
    return `Billable hours ${format(from, 'MMMM yyyy')}`;
  }
  if (!from || !to) {
    return 'Billable hours';
  }

  const fullMonth =
    format(from, 'yyyy-MM-dd') === format(startOfMonth(from), 'yyyy-MM-dd') &&
    format(to, 'yyyy-MM-dd') === format(endOfMonth(from), 'yyyy-MM-dd') &&
    isSameMonth(from, to);

  if (fullMonth) {
    return `Billable hours ${format(from, 'MMMM yyyy')}`;
  }

  if (isSameMonth(from, to)) {
    return `Billable hours ${format(from, 'd')}–${format(to, 'd MMMM yyyy')}`;
  }

  return `Billable hours ${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
}
