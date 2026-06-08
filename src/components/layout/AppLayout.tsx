import { ReactNode, useState, useEffect, FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Menu, ChevronDown, ChevronLeft, Search } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { canAccessContracts, canAccessNotes } from '@/lib/features';
import { isClientDetailPath } from '@/lib/clientsNavigation';
import { cn } from '@/lib/utils';
import { useBranding } from '@/hooks/useBranding';
import { shellProfileDisplayName, useShellProfile } from '@/hooks/useShellProfile';
import { brandingAssetUrl } from '@/lib/brandingUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { ShellImageWithSkeleton } from '@/components/ui/shell-image-skeleton';
import { useTimer } from '@/contexts/TimerContext';
import { TrialBanner } from './TrialBanner';
import { TimerBar } from './TimerBar';
import { StartGuide } from './StartGuide';
import { FeedbackTab } from './FeedbackTab';
import { SidebarNavFlyout, type SidebarFlyoutLink } from './SidebarNavFlyout';
import { SidebarNavCollapsedTooltip } from './SidebarNavCollapsedTooltip';
import { shellNavIcon, shellNavLink, shellSubNavLink } from './shellNav';

interface AppLayoutProps {
  children: ReactNode;
}

/** Matches main content horizontal padding. */
const CONTENT_X = 'px-4 lg:px-8';

/** Sidebar width (~24px narrower than w-64). */
const SHELL_SIDEBAR_EXPANDED = 'w-[232px]';
const SHELL_SIDEBAR_COLLAPSED = 'w-14';
const SHELL_SIDEBAR_LEFT_EXPANDED = 'lg:left-[232px]';

/** White wordmark + colour icon for expanded dark shell only (not user-uploaded sidebar logo). */
const SHELL_LOGO_FULL = '/lance-logo-white-colour.png';

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
  if (status === 'paused') return 'Paused';
  return 'Free';
}
export function AppLayout({
  children
}: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: branding, isPending: brandingPending, isSuccess: brandingReady } = useBranding();
  const { data: profile, isPending: profilePending, isSuccess: profileReady } = useShellProfile(user?.id);
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }
    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (!error) setUnreadNotifications(count ?? 0);
    };
    fetchUnread();
    const channel = supabase
      .channel(`notifications-unread-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchUnread(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
    navigate('/auth', { replace: true });
  };
  const displayName = profileReady ? shellProfileDisplayName(profile) : null;
  const userInitials = displayName ? displayName.slice(0, 2).toUpperCase() : '';
  const userName = displayName ?? '';
  const profileLoading = !!user && (profilePending || !profileReady);
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
  const showTrialBanner = isOnTrial && profile?.is_lifetime !== true && !trialBannerDismissed;
  const handleTrialBannerDismiss = () => {
    setTrialBannerDismissed(true);
    try { localStorage.setItem('trial_banner_dismissed', 'true'); } catch { /* ignore localStorage */ }
  };
  const timer = useTimer();
  const showTimerBar = timer.draftSegments.length > 0;
  const showContracts = canAccessContracts({ isAdmin: profile?.is_admin === true });
  const showNotes = canAccessNotes({ isAdmin: profile?.is_admin === true });
  const closeMobileSidebar = () => setSidebarOpen(false);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const clientsFlyoutLinks: SidebarFlyoutLink[] = [
    { to: '/clients/list', label: 'All clients', isActive: location.pathname === '/clients/list' },
    { to: '/clients/active', label: 'Active clients', isActive: location.pathname === '/clients/active' },
    {
      to: '/clients',
      label: 'CRM',
      isActive:
        location.pathname === '/clients' ||
        location.pathname === '/clients/board' ||
        isClientDetailPath(location.pathname),
    },
  ];

  const timeFlyoutLinks: SidebarFlyoutLink[] = [
    { to: '/time', label: 'Timesheet', isActive: location.pathname === '/time' },
    { to: '/time/timer', label: 'Timer', isActive: location.pathname === '/time/timer' },
    { to: '/time/history', label: 'All logs', isActive: location.pathname === '/time/history' },
  ];

  const renderSidebarLogo = () => {
    if (brandingPending || !brandingReady) {
      return sidebarCollapsed ? (
        <Skeleton className="h-7 w-7 shrink-0 rounded-lg bg-white/20" />
      ) : (
        <Skeleton className="h-5 w-[100px] shrink-0 rounded-md bg-white/20" />
      );
    }

    const iconSize =
      branding?.logo_size === 'sm' || branding?.logo_size === 'lg'
        ? { sm: 'h-6 w-6', lg: 'h-8 w-8' }[branding.logo_size]
        : 'h-7 w-7';

    if (sidebarCollapsed) {
      const iconSrc =
        brandingAssetUrl(branding?.icon_url, branding?.updated_at) ?? SHELL_LOGO_FULL;
      return (
        <ShellImageWithSkeleton
          src={iconSrc}
          alt="Lance"
          className={cn('shrink-0', iconSize)}
          skeletonClassName={iconSize}
        />
      );
    }
    return (
      <ShellImageWithSkeleton
        src={SHELL_LOGO_FULL}
        alt="Lance"
        className="h-5 w-[100px] shrink-0"
        skeletonClassName="h-5 w-[100px]"
      />
    );
  };

  const wrapCollapsedNav = (label: string, node: ReactNode) =>
    sidebarCollapsed ? <SidebarNavCollapsedTooltip label={label}>{node}</SidebarNavCollapsedTooltip> : node;

  const shellIconBtn =
    'h-8 w-8 text-white/80 hover:bg-sidebar-accent hover:text-white';

  const shellTopBarActions = () => (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button variant="ghost" size="icon" className={shellIconBtn} asChild>
        <Link to="/settings" aria-label="Settings">
          <SlotIcon slot="nav_settings" className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" className={cn('relative', shellIconBtn)} asChild>
        <Link to="/notifications" aria-label="Notifications">
          <SlotIcon slot="nav_bell" className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold text-primary-foreground">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Link>
      </Button>
      <Button variant="ghost" size="icon" className={shellIconBtn} asChild>
        <a href="https://get-lance.crisp.help/en/" target="_blank" rel="noopener noreferrer" aria-label="Help">
          <SlotIcon slot="help_book" className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );

  const mobileTopBarActions = () => (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link to="/settings" aria-label="Settings">
          <SlotIcon slot="nav_settings" className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" className="relative h-8 w-8" asChild>
        <Link to="/notifications" aria-label="Notifications">
          <SlotIcon slot="nav_bell" className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold text-primary-foreground">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Link>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <a href="https://get-lance.crisp.help/en/" target="_blank" rel="noopener noreferrer" aria-label="Help">
          <SlotIcon slot="help_book" className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );

  const userMenuSkeleton = (shell?: boolean) => (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md px-1.5 py-1',
        shell ? 'text-white/90' : '',
      )}
      aria-hidden
    >
      <Skeleton className={cn('h-7 w-7 shrink-0 rounded-full', shell ? 'bg-white/20' : 'bg-muted')} />
      <Skeleton className={cn('hidden h-3 w-16 rounded md:block', shell ? 'bg-white/20' : 'bg-muted')} />
    </div>
  );

  const userMenu = (align: 'end' | 'start' = 'end', shell?: boolean) => {
    if (profileLoading) {
      return userMenuSkeleton(shell);
    }

    return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors',
            shell ? 'text-white/90 hover:bg-sidebar-accent' : 'hover:bg-muted',
          )}
        >
          <Avatar className="h-7 w-7 border border-white/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
              {userInitials || '…'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate text-xs font-normal md:inline">{userName}</span>
          <ChevronDown className="hidden h-3 w-3 shrink-0 opacity-60 md:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
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
          <a href="https://get-lance.crisp.help/en/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
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
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <SlotIcon slot="auth_sign_out" className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    );
  };

  return <div className="min-h-screen flex flex-col">
      {/* Trial Banner – when dismissed, sidebar lifts to top (no blank space) */}
      {showTrialBanner && <TrialBanner onUpgrade={() => navigate('/settings/subscription')} onDismiss={handleTrialBannerDismiss} />}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className={cn("fixed inset-0 z-40 bg-black/50 lg:hidden", showTrialBanner && "top-[40px]")} onClick={() => setSidebarOpen(false)} />}

      <div
        className={cn(
          'flex min-h-0 flex-1',
          showTrialBanner ? 'min-h-[calc(100vh-40px)]' : 'min-h-screen',
        )}
      >
        {/* Sidebar */}
        <aside
          className={cn(
            'group/sidebar z-50 flex shrink-0 flex-col bg-sidebar transition-all duration-200',
            'fixed bottom-0 left-0 lg:sticky lg:top-0',
            showTrialBanner ? 'top-[40px]' : 'top-0',
            showTrialBanner ? 'h-[calc(100vh-40px)]' : 'h-screen',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            sidebarCollapsed ? cn(SHELL_SIDEBAR_COLLAPSED, 'overflow-visible') : SHELL_SIDEBAR_EXPANDED,
          )}
        >
          <div
            className={cn(
              'shrink-0',
              sidebarCollapsed ? 'flex justify-center px-2 py-3' : 'flex h-14 items-center pl-6 pr-3',
            )}
          >
            <Link
              to="/dashboard"
              className={cn('flex w-full min-w-0 items-center', sidebarCollapsed && 'justify-center')}
              onClick={closeMobileSidebar}
            >
              {renderSidebarLogo()}
            </Link>
          </div>

          <nav
            className={cn(
              'min-h-0 flex-1 space-y-2 px-2 py-2',
              sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden px-3',
            )}
          >
            {wrapCollapsedNav(
              'Dashboard',
              <Link
                to="/dashboard"
                onClick={closeMobileSidebar}
                className={shellNavLink(location.pathname === '/dashboard', sidebarCollapsed)}
              >
                <SlotIcon slot="sidebar_dashboard" className={shellNavIcon(location.pathname === '/dashboard')} />
                {!sidebarCollapsed && 'Dashboard'}
              </Link>,
            )}

            {sidebarCollapsed ? (
              <SidebarNavFlyout
                title="Clients"
                icon={<SlotIcon slot="sidebar_clients" className={shellNavIcon(isClientsActive)} />}
                links={clientsFlyoutLinks}
                isSectionActive={isClientsActive}
                defaultHref="/clients/list"
                onNavigate={closeMobileSidebar}
              />
            ) : (
              <Collapsible open={clientsOpen} onOpenChange={setClientsOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={cn(shellNavLink(isClientsActive), 'w-full justify-between')}>
                    <span className="flex items-center gap-3">
                      <SlotIcon slot="sidebar_clients" className={shellNavIcon(isClientsActive)} />
                      Clients
                    </span>
                    <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-white/60 transition-transform', clientsOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 space-y-1.5 pl-4">
                  {clientsFlyoutLinks.map((link) => (
                    <Link key={link.to} to={link.to} onClick={closeMobileSidebar} className={shellSubNavLink(link.isActive)}>
                      {link.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {wrapCollapsedNav(
              'Projects',
              <Link
                to="/projects"
                onClick={closeMobileSidebar}
                className={shellNavLink(isProjectsActive, sidebarCollapsed)}
              >
                <SlotIcon slot="sidebar_projects" className={shellNavIcon(isProjectsActive)} />
                {!sidebarCollapsed && 'Projects'}
              </Link>,
            )}

            {sidebarCollapsed ? (
              <SidebarNavFlyout
                title="Time"
                icon={<SlotIcon slot="sidebar_time" className={shellNavIcon(isTimeActive)} />}
                links={timeFlyoutLinks}
                isSectionActive={isTimeActive}
                defaultHref="/time/timer"
                onNavigate={closeMobileSidebar}
              />
            ) : (
              <Collapsible open={timeOpen} onOpenChange={setTimeOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={cn(shellNavLink(isTimeActive), 'w-full justify-between')}>
                    <span className="flex items-center gap-3">
                      <SlotIcon slot="sidebar_time" className={shellNavIcon(isTimeActive)} />
                      Time
                    </span>
                    <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-white/60 transition-transform', timeOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 space-y-1.5 pl-4">
                  {timeFlyoutLinks.map((link) => (
                    <Link key={link.to} to={link.to} onClick={closeMobileSidebar} className={shellSubNavLink(link.isActive)}>
                      {link.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {showNotes
              ? wrapCollapsedNav(
                  'Notes',
                  <Link
                    to="/notes"
                    onClick={closeMobileSidebar}
                    className={shellNavLink(location.pathname === '/notes', sidebarCollapsed)}
                  >
                    <SlotIcon slot="sidebar_notes" className={shellNavIcon(location.pathname === '/notes')} />
                    {!sidebarCollapsed && 'Notes'}
                  </Link>,
                )
              : null}
            {wrapCollapsedNav(
              'Invoices',
              <Link
                to="/invoices"
                onClick={closeMobileSidebar}
                className={shellNavLink(location.pathname === '/invoices', sidebarCollapsed)}
              >
                <SlotIcon slot="sidebar_invoices" className={shellNavIcon(location.pathname === '/invoices')} />
                {!sidebarCollapsed && 'Invoices'}
              </Link>,
            )}
            {wrapCollapsedNav(
              'Proposals',
              <Link
                to="/proposals"
                onClick={closeMobileSidebar}
                className={shellNavLink(location.pathname.startsWith('/proposals'), sidebarCollapsed)}
              >
                <SlotIcon slot="sidebar_proposals" className={shellNavIcon(location.pathname.startsWith('/proposals'))} />
                {!sidebarCollapsed && (
                  <>
                    Proposals
                    <Badge className="shrink-0 bg-purple-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-purple-600">New</Badge>
                  </>
                )}
              </Link>,
            )}
            {showContracts
              ? wrapCollapsedNav(
                  'Contracts',
                  <Link
                    to="/contracts"
                    onClick={closeMobileSidebar}
                    className={shellNavLink(location.pathname.startsWith('/contracts'), sidebarCollapsed)}
                  >
                    <SlotIcon slot="sidebar_contracts" className={shellNavIcon(location.pathname.startsWith('/contracts'))} />
                    {!sidebarCollapsed && (
                      <>
                        Contracts
                        <Badge className="shrink-0 bg-purple-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-purple-600">New</Badge>
                      </>
                    )}
                  </Link>,
                )
              : null}
            {wrapCollapsedNav(
              'Services',
              <Link
                to="/services"
                onClick={closeMobileSidebar}
                className={shellNavLink(location.pathname === '/services', sidebarCollapsed)}
              >
                <SlotIcon slot="sidebar_services" className={shellNavIcon(location.pathname === '/services')} />
                {!sidebarCollapsed && 'Services'}
              </Link>,
            )}
            {wrapCollapsedNav(
              'Approvals',
              <Link
                to="/reviews"
                onClick={closeMobileSidebar}
                className={shellNavLink(location.pathname === '/reviews', sidebarCollapsed)}
              >
                <SlotIcon slot="sidebar_reviews" className={shellNavIcon(location.pathname === '/reviews')} />
                {!sidebarCollapsed && (
                  <>
                    Approvals
                    <Badge className="shrink-0 bg-purple-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-purple-600">New</Badge>
                  </>
                )}
              </Link>,
            )}
          </nav>

          <div
            className={cn(
              'shrink-0',
              sidebarCollapsed ? 'flex justify-center p-2' : 'flex justify-end px-3 py-2',
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="inline-flex h-8 w-8 text-white/60 hover:bg-sidebar-accent hover:text-white"
              onClick={toggleSidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
            </Button>
          </div>
        </aside>

        {/* Content column — dark top bar + white panel (scoop) below */}
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col bg-sidebar',
            showTimerBar && 'pb-14',
          )}
        >
          <header className="hidden h-10 shrink-0 items-center gap-3 bg-sidebar py-1.5 pr-2 lg:flex">
            <form onSubmit={handleSearchSubmit} className="min-w-0 max-w-md shrink-0">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
                <Input
                  type="search"
                  placeholder="Search Lance…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-full min-w-[12rem] rounded-full border border-white/80 bg-black/15 py-1 pl-3 pr-9 text-xs text-white placeholder:text-white/45 focus-visible:ring-1 focus-visible:ring-white/60 sm:min-w-[16rem] lg:min-w-[20rem]"
                />
              </div>
            </form>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {shellTopBarActions()}
              {userMenu('end', true)}
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-tl-[20px] bg-background">
            <header className={cn('sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur-md lg:hidden', CONTENT_X)}>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {mobileTopBarActions()}
                {userMenu('end', false)}
              </div>
            </header>

            <main className={cn('min-h-0 flex-1 overflow-y-auto py-4 lg:py-8', CONTENT_X)}>
              {children}
            </main>

            <StartGuide />
            <FeedbackTab />
          </div>
        </div>
      </div>

      {/* Timer bar */}
      {showTimerBar && (
        <div
          className={cn(
            'fixed bottom-0 right-0 z-[60] left-0',
            sidebarCollapsed ? 'lg:left-14' : SHELL_SIDEBAR_LEFT_EXPANDED,
          )}
        >
          <TimerBar />
        </div>
      )}
    </div>;
}