import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  User,
  Building2,
  FileText,
  Globe,
  CreditCard,
  HardDrive,
  LogOut,
} from 'lucide-react';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  subscription_status: string | null;
}

const navItems = [
  { path: 'profile', label: 'Profile', icon: User },
  { path: 'business', label: 'Company Settings', icon: Building2 },
  { path: 'invoices', label: 'Invoice Settings', icon: FileText },
  { path: 'locale', label: 'Personal Preferences', icon: Globe },
  { path: 'subscription', label: 'Billing & Subscription', icon: CreditCard },
  { path: 'storage', label: 'Storage', icon: HardDrive },
];

export default function SettingsLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('first_name, last_name, full_name, email, avatar_url, subscription_status')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  if (!user) return <Navigate to="/auth" replace />;

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : profile?.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase() || 'U';
  const planLabel =
    profile?.subscription_status === 'active'
      ? 'Business'
      : profile?.subscription_status === 'trial'
        ? 'Trial'
        : 'Free Plan';

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
        <aside className="lg:w-56 shrink-0">
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email || user.email}</p>
              </div>
            </div>
            <div>
              <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5">
                {planLabel}
              </span>
            </div>
            <nav className="space-y-0.5 pt-2 border-t">
              {navItems.map((item) => {
                const href = `/settings/${item.path}`;
                const isActive = location.pathname === href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </AppLayout>
  );
}
