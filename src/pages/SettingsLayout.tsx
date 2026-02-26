import { Link, Outlet, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import { User, Building2, Globe, Receipt, CreditCard, Bell, HardDrive } from '@/components/icons';

const settingsNav = [
  { path: '/settings/profile', label: 'Profile', icon: User },
  { path: '/settings/business', label: 'Company', icon: Building2 },
  { path: '/settings/locale', label: 'Locale', icon: Globe },
  { path: '/settings/invoices', label: 'Invoices', icon: Receipt },
  { path: '/settings/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings/subscription', label: 'Billing', icon: CreditCard },
  { path: '/settings/storage', label: 'Storage', icon: HardDrive },
];

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
        <aside className="lg:w-56 shrink-0 min-w-0">
          <nav className="rounded-xl border bg-card p-2 space-y-0.5">
            {settingsNav.map(({ path, label, icon: Icon }) => {
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
                  <Icon className="h-4 w-4 shrink-0" />
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
