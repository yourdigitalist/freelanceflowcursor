import type { BreadcrumbSegment } from '@/components/layout/PageBreadcrumb';

export function getAdminBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const items: BreadcrumbSegment[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Admin', href: '/admin/overview' },
  ];

  const pageLabels: Record<string, string> = {
    '/admin/overview': 'Overview',
    '/admin/metrics': 'Metrics',
    '/admin/landing-content': 'Landing content',
    '/admin/announcements': 'Announcements',
    '/admin/comms': 'Comms & templates',
    '/admin/branding': 'Branding',
    '/admin/icons': 'Icons',
    '/admin/help-content': 'Help content',
    '/admin/feature-requests': 'Feature requests',
    '/admin/feedback': 'Feedback',
    '/admin/system-check': 'System check',
  };

  const pageLabel = pageLabels[pathname];
  if (pageLabel) {
    items.push({ label: pageLabel });
  }

  return items;
}
