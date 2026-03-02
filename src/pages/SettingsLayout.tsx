import { Link, Outlet, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import { SlotIcon } from '@/contexts/IconSlotContext';

const settingsNav = [
  { path: '/settings/profile', label: 'Profile', slot: 'settings_profile' as const },
  { path: '/settings/business', label: 'Company', slot: 'settings_business' as const },
  { path: '/settings/locale', label: 'Locale', slot: 'settings_locale' as const },
  { path: '/settings/invoices', label: 'Invoice Settings', slot: 'settings_invoices' as const },
  { path: '/settings/notifications', label: 'Notification Settings', slot: 'settings_notifications' as const },
  { path: '/settings/subscription', label: 'Billing and Subscription', slot: 'settings_subscription' as const },
  { path: '/settings/storage', label: 'Storage', slot: 'settings_storage' as const },
];

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
        <aside className="lg:w-56 shrink-0 min-w-0">
          <nav className="rounded-xl border bg-card p-2 space-y-0.5">
            {settingsNav.map(({ path, label, slot }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <SlotIcon slot={slot} className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </AppLayout>
  );
}
