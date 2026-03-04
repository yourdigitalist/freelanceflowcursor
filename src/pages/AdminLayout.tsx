import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, ShieldCheck } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';

const adminNavItems = [
  { path: '/admin/overview', label: 'Overview', slot: 'admin_overview' as const },
  { path: '/admin/landing-content', label: 'Landing content', slot: 'admin_landing_content' as const },
  { path: '/admin/announcements', label: 'Announcements', slot: 'admin_announcements' as const },
  { path: '/admin/comms', label: 'Comms & templates', slot: 'admin_comms' as const },
  { path: '/admin/branding', label: 'Branding', slot: 'admin_branding' as const },
  { path: '/admin/icons', label: 'Icons', slot: 'admin_icons' as const },
  { path: '/admin/help-content', label: 'Help content', slot: 'admin_help_content' as const },
  { path: '/admin/feature-requests', label: 'Feature requests', slot: 'admin_feature_requests' as const },
  { path: '/admin/feedback', label: 'Feedback', slot: 'admin_feedback' as const },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
  }, [user]);

  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
        <aside className="lg:w-56 shrink-0 min-w-0">
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold">Admin</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="w-full justify-start text-muted-foreground">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to app
              </Link>
            </Button>
            <nav className="space-y-0.5 pt-2 border-t">
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <SlotIcon slot={item.slot} className="h-4 w-4 shrink-0" />
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
