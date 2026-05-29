import type { BreadcrumbSegment } from '@/components/layout/PageBreadcrumb';

export function withDashboardTrail(items: BreadcrumbSegment[]): BreadcrumbSegment[] {
  if (items.length > 0 && items[0].label === 'Dashboard') return items;
  return [{ label: 'Dashboard', href: '/dashboard' }, ...items];
}

/** Breadcrumb for a top-level app list page (e.g. Projects, Invoices). */
export function listPageBreadcrumb(sectionLabel: string): BreadcrumbSegment[] {
  return withDashboardTrail([{ label: sectionLabel }]);
}

/** Breadcrumb for a detail page under a list section. */
export function detailPageBreadcrumb(
  sectionLabel: string,
  sectionHref: string,
  currentLabel: string,
): BreadcrumbSegment[] {
  return withDashboardTrail([
    { label: sectionLabel, href: sectionHref },
    { label: currentLabel },
  ]);
}
