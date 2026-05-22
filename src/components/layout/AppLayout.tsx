import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Menu, ChevronDown, ChevronLeft, ChevronUp, ShieldCheck, Briefcase } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { canAccessContracts } from '@/lib/features';
import { cn } from '@/lib/utils';
import { useBranding } from '@/hooks/useBranding';
import { useTimer } from '@/contexts/TimerContext';
import { TrialBanner } from './TrialBanner';
import { TimerBar } from './TimerBar';
import { StartGuide } from './StartGuide';
import { FeedbackTab } from './FeedbackTab';
interface AppLayoutProps {
  children: ReactNode;
}
interface Project {
  id: string;
  name: string;
  icon_emoji?: string;
  icon_color?: string;
}
interface Profile {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  trial_end_date: string | null;
  is_admin: boolean | null;
}

function getPlanBadgeLabel(
  status: string | null | undefined,
  planType: string | null | undefined,
  trialEnd: Date | null,
): string {
  if (status === 'trial' && trialEnd && trialEnd >= new Date()) return 'Free trial';
  if (status === 'active') {
    if (planType === 'pro_annual') return 'Pro Annual';
    if (planType === 'pro_monthly') return 'Pro Monthly';
    return 'Pro';
  }
  if (status === 'past_due') return 'Past due';
  return 'Free';
}
const navigation = [
  { name: 'Dashboard', href: '/dashboard', slot: 'sidebar_dashboard' as const },
  { name: 'Clients', href: '/clients', slot: 'sidebar_clients' as const },
  { name: 'Time', href: '/time', slot: 'sidebar_time' as const },
  { name: 'Invoices', href: '/invoices', slot: 'sidebar_invoices' as const },
  { name: 'Approvals', href: '/reviews', slot: 'sidebar_reviews' as const },
];
export function AppLayout({
  children
}: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: branding } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebarCollapsed', next ? 'true' : 'false');
      } catch { /* ignore localStorage */ }
      return next;
    });
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const {
        data
      } = await supabase.from('profiles').select('first_name, last_name, full_name, email, avatar_url, subscription_status, plan_type, trial_end_date, is_admin').eq('user_id', user.id).single();
      setProfile(data);
    };
    if (user) {
      fetchProfile();
    }
  }, [user]);
  useEffect(() => {
    if (location.pathname.startsWith('/clients')) setClientsOpen(true);
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname.startsWith('/time')) {
      setTimeOpen(true);
    }
  }, [location.pathname]);
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = displayName.slice(0, 2).toUpperCase() || 'U';
  const userName = displayName;
  const isProjectsActive = location.pathname.startsWith('/projects');
  const isClientsActive = location.pathname.startsWith('/clients');
  const [clientsOpen, setClientsOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const isTimeActive = location.pathname.startsWith('/time');
  const trialEndDate = profile?.trial_end_date ? new Date(profile.trial_end_date) : null;
  const isOnTrial = profile?.subscription_status === 'trial' && !!trialEndDate && trialEndDate >= new Date();
  const planBadgeLabel = getPlanBadgeLabel(profile?.subscription_status, profile?.plan_type, trialEndDate);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(() => {
    try { return localStorage.getItem('trial_banner_dismissed') === 'true'; } catch { /* ignore */ return false; }
  });
  const showTrialBanner = isOnTrial && !trialBannerDismissed;
  const handleTrialBannerDismiss = () => {
    setTrialBannerDismissed(true);
    try { localStorage.setItem('trial_banner_dismissed', 'true'); } catch { /* ignore localStorage */ }
  };
  const timer = useTimer();
  const showTimerBar = timer.draftSegments.length > 0;
  const showContracts = canAccessContracts({ isAdmin: profile?.is_admin === true });
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Trial Banner – when dismissed, sidebar lifts to top (no blank space) */}
      {showTrialBanner && <TrialBanner onUpgrade={() => navigate('/settings/subscription')} onDismiss={handleTrialBannerDismiss} />}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className={cn("fixed inset-0 z-40 bg-black/50 lg:hidden", showTrialBanner && "top-[40px]")} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn("fixed left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 transform lg:translate-x-0", showTrialBanner ? "top-[40px] h-[calc(100vh-40px)]" : "top-0 h-screen", sidebarOpen ? "translate-x-0" : "-translate-x-full", sidebarCollapsed ? "w-16 overflow-visible" : "w-64")}>
        {/* Logo Header: collapsed = centered logo + edge toggle; expanded = row */}
        <div
          className={cn(
            'border-b border-sidebar-border',
            sidebarCollapsed
              ? 'relative overflow-visible p-2 pb-3'
              : 'flex h-[5rem] items-center justify-between px-4 pt-4',
          )}
        >
          {(() => {
            const size = branding?.logo_size === 'sm' || branding?.logo_size === 'lg' ? branding.logo_size : 'md';
            const iconSize = sidebarCollapsed ? 'h-7 w-7 min-h-7 min-w-7 shrink-0' : { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' }[size];
            const logoWidthPx = branding?.logo_width != null && branding.logo_width >= 24 && branding.logo_width <= 400
              ? branding.logo_width
              : 120;
            return sidebarCollapsed ? (
              <span className="relative block">
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center rounded-xl px-2 py-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  {branding?.icon_url ? (
                    <img src={branding.icon_url} alt="Lance" className={cn('rounded-lg object-contain', iconSize)} />
                  ) : (
                    <Briefcase className={cn('text-primary', iconSize)} />
                  )}
                </Link>
              </span>
            ) : (
              <Link to="/dashboard" className="flex items-center gap-2 min-w-0 h-full flex-1" onClick={() => setSidebarOpen(false)}>
                {branding?.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt="Lance"
                    className="object-contain object-left shrink-0"
                    style={{ height: '100%', width: `${logoWidthPx}px` }}
                  />
                ) : (
                  <span className="flex items-center gap-2 font-semibold text-sidebar-foreground">
                    <Briefcase className="h-6 w-6 text-primary shrink-0" />
                    Lance
                  </span>
                )}
              </Link>
            );
          })()}
          <Button
            variant={sidebarCollapsed ? 'outline' : 'ghost'}
            size="icon"
            className={cn(
              'shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground',
              sidebarCollapsed
                ? 'absolute right-0 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full border-sidebar-border bg-background shadow-sm hover:bg-muted lg:inline-flex'
                : 'hidden h-8 w-8 lg:flex',
            )}
            onClick={toggleSidebarCollapsed}
          >
            <ChevronLeft className={cn('transition-transform', sidebarCollapsed ? 'h-3 w-3 rotate-180' : 'h-4 w-4')} />
          </Button>
        </div>

        {/* Navigation - order: Dashboard, Clients, Projects, Time, Invoices, Reviews */}
        <nav className={cn("flex-1 overflow-y-auto space-y-1", sidebarCollapsed ? "p-2" : "p-3")}>
          <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
            {location.pathname === '/dashboard' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
            <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/dashboard' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <SlotIcon slot="sidebar_dashboard" className={cn("h-4 w-4 shrink-0", location.pathname === '/dashboard' && "text-primary")} />
              {!sidebarCollapsed && 'Dashboard'}
            </Link>
          </span>
          {sidebarCollapsed ? (
            <span className="relative block mr-1">
              {isClientsActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
              <Link to="/clients" onClick={() => setSidebarOpen(false)} className={cn("flex items-center justify-center px-2 py-2.5 rounded-xl text-sm font-medium transition-colors", isClientsActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                <SlotIcon slot="sidebar_clients" className={cn("h-4 w-4 shrink-0", isClientsActive && "text-primary")} />
              </Link>
            </span>
          ) : (
            <Collapsible open={clientsOpen} onOpenChange={setClientsOpen}>
              <CollapsibleTrigger asChild>
                <span className="relative block mr-1">
                  {isClientsActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
                  <button className={cn("flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", isClientsActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                    <div className="flex items-center gap-3">
                      <SlotIcon slot="sidebar_clients" className={cn("h-4 w-4 shrink-0", isClientsActive && "text-primary")} />
                      Clients
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", clientsOpen && "rotate-180")} />
                  </button>
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-1 mt-1">
                <Link to="/clients/list" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/clients/list' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  All clients
                </Link>
                <Link to="/clients/active" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/clients/active' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  Active clients
                </Link>
                <Link to="/clients" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", (location.pathname === '/clients' || location.pathname === '/clients/board') ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  CRM
                </Link>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Projects */}
          <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
            {isProjectsActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
            <Link to="/projects" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", isProjectsActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <SlotIcon slot="sidebar_projects" className={cn("h-4 w-4 shrink-0", isProjectsActive && "text-primary")} />
              {!sidebarCollapsed && 'Projects'}
            </Link>
          </span>

          {/* Time with sub-items: Timesheet, Timer, History */}
          {sidebarCollapsed ? (
            <span className="relative block mr-1">
              {isTimeActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
              <Link to="/time" onClick={() => setSidebarOpen(false)} className={cn("flex items-center justify-center px-2 py-2.5 rounded-xl text-sm font-medium transition-colors", isTimeActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                <SlotIcon slot="sidebar_time" className={cn("h-4 w-4 shrink-0", isTimeActive && "text-primary")} />
              </Link>
            </span>
          ) : (
            <Collapsible open={timeOpen} onOpenChange={setTimeOpen}>
              <CollapsibleTrigger asChild>
                <span className="relative block mr-1">
                  {isTimeActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
                  <button className={cn("flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", isTimeActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                    <div className="flex items-center gap-3">
                      <SlotIcon slot="sidebar_time" className={cn("h-4 w-4 shrink-0", isTimeActive && "text-primary")} />
                      Time
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", timeOpen && "rotate-180")} />
                  </button>
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-1 mt-1">
                <Link to="/time" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/time' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  Timesheet
                </Link>
                <Link to="/time/timer" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/time/timer' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  Timer
                </Link>
                <Link to="/time/history" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/time/history' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  All logs
                </Link>
              </CollapsibleContent>
            </Collapsible>
          )}
          <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
            {location.pathname === '/invoices' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
            <Link to="/invoices" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/invoices' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <SlotIcon slot="sidebar_invoices" className={cn("h-4 w-4 shrink-0", location.pathname === '/invoices' && "text-primary")} />
              {!sidebarCollapsed && 'Invoices'}
            </Link>
          </span>
          <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
            {location.pathname.startsWith('/proposals') && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
            <Link to="/proposals" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname.startsWith('/proposals') ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <SlotIcon slot="sidebar_proposals" className={cn("h-4 w-4 shrink-0", location.pathname.startsWith('/proposals') && "text-primary")} />
              {!sidebarCollapsed && (
                <>
                  Proposals
                  <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] px-1.5 py-0 font-medium shrink-0">Beta</Badge>
                </>
              )}
            </Link>
          </span>
          {showContracts ? (
            <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
              {location.pathname.startsWith('/contracts') && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
              <Link to="/contracts" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname.startsWith('/contracts') ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                <SlotIcon slot="sidebar_contracts" className={cn("h-4 w-4 shrink-0", location.pathname.startsWith('/contracts') && "text-primary")} />
                {!sidebarCollapsed && (
                  <>
                    Contracts
                    <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] px-1.5 py-0 font-medium shrink-0">Beta</Badge>
                  </>
                )}
              </Link>
            </span>
          ) : null}
          <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
            {location.pathname === '/services' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
            <Link to="/services" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/services' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <SlotIcon slot="sidebar_services" className={cn("h-4 w-4 shrink-0", location.pathname === '/services' && "text-primary")} />
              {!sidebarCollapsed && 'Services'}
            </Link>
          </span>
          <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
            {location.pathname === '/reviews' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
            <Link to="/reviews" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/reviews' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <SlotIcon slot="sidebar_reviews" className={cn("h-4 w-4 shrink-0", location.pathname === '/reviews' && "text-primary")} />
            {!sidebarCollapsed && (
              <>
                Approvals
                <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] px-1.5 py-0 font-medium shrink-0">Beta</Badge>
              </>
            )}
            </Link>
          </span>
        </nav>

        {/* Bottom section */}
        <div className={cn("space-y-2 border-t border-sidebar-border", sidebarCollapsed ? "p-2" : "p-3")}>
          {/* Notifications */}
          <span className={cn("relative block", !sidebarCollapsed && "mr-1")}>
            {location.pathname === '/notifications' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />}
            <Link to="/notifications" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/notifications' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <SlotIcon slot="nav_bell" className={cn("h-4 w-4 shrink-0", location.pathname === '/notifications' && "text-primary")} />
            {!sidebarCollapsed && 'Notifications'}
          </Link>
          </span>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors", sidebarCollapsed && "justify-center")}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-success text-success-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && <>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">{userName}</p>
                    </div>
                    <ChevronUp className="h-4 w-4 text-sidebar-foreground/60" />
                  </>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-64">
              <div className="p-3 space-y-2">
                <p className="text-sm font-semibold leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
                <Link
                  to="/settings/subscription"
                  className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  {planBadgeLabel}
                </Link>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <SlotIcon slot="nav_settings" className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/notifications" className="cursor-pointer">
                  <SlotIcon slot="nav_bell" className="mr-2 h-4 w-4" />
                  Notifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://get-lance.crisp.help/en/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <SlotIcon slot="help_book" className="mr-2 h-4 w-4" />
                  Help Center
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/feature-requests" className="cursor-pointer">
                  <SlotIcon slot="help_book" className="mr-2 h-4 w-4" />
                  Feature requests
                </Link>
              </DropdownMenuItem>
              {profile?.is_admin === true && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="cursor-pointer">
                    <SlotIcon slot="admin_overview" className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer focus:text-destructive">
                <SlotIcon slot="auth_sign_out" className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content – use margin so content sits to the right of the sidebar */}
      <div className={cn("flex-1 min-w-0 relative transition-all duration-200", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64", showTimerBar && "pb-14")}>
        {/* Mobile top bar only - hidden on desktop */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/80 backdrop-blur-md px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="ml-auto" asChild>
            <Link to="/notifications">
              <SlotIcon slot="nav_bell" className="h-4 w-4" />
            </Link>
          </Button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 min-h-0">
          {children}
        </main>

        {/* Floating setup guide (corner panel) */}
        <StartGuide />
        <FeedbackTab />
      </div>

      {/* Timer bar – fixed at bottom of viewport so always visible; left offset on lg so it doesn't cover sidebar */}
      {showTimerBar && (
        <div className={cn("fixed bottom-0 right-0 z-[60] left-0", sidebarCollapsed ? "lg:left-16" : "lg:left-64")}>
          <TimerBar />
        </div>
      )}
    </div>;
}