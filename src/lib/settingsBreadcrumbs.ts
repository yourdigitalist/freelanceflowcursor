import type { BreadcrumbSegment } from '@/components/layout/PageBreadcrumb';

const settingsRoot: BreadcrumbSegment = { label: 'Settings', href: '/settings/profile' };

export function getSettingsBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  switch (pathname) {
    case '/settings/profile':
      return [settingsRoot, { label: 'Profile' }];
    case '/settings/business':
      return [
        settingsRoot,
        { label: 'Company', href: '/settings/business' },
        { label: 'Business Information' },
      ];
    case '/settings/locale':
      return [settingsRoot, { label: 'Locale' }];
    case '/settings/invoices':
      return [settingsRoot, { label: 'Invoice Settings' }];
    case '/settings/payments':
      return [settingsRoot, { label: 'Client payments' }];
    case '/settings/proposals':
      return [settingsRoot, { label: 'Proposal Settings' }];
    case '/settings/notifications':
      return [settingsRoot, { label: 'Notification Settings' }];
    case '/settings/subscription':
      return [settingsRoot, { label: 'Billing and Subscription' }];
    case '/settings/storage':
      return [settingsRoot, { label: 'Storage' }];
    default:
      return [settingsRoot];
  }
}
