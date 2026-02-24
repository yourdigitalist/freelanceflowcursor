import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutDashboard, Users, User, FolderKanban, Clock, FileText, LogOut, Menu, ChevronDown, ChevronLeft, Bell, Sparkles, ArrowRight, ChevronUp, Eye, Building2, Globe, CreditCard, HardDrive, HelpCircle, ShieldCheck, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/hooks/useBranding';
import { useTimer } from '@/contexts/TimerContext';
import { TrialBanner } from './TrialBanner';
import { TimerBar } from './TimerBar';
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
  is_admin: boolean | null;
}
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Time', href: '/time', icon: Clock },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Reviews', href: '/reviews', icon: Eye },
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
      } catch {}
      return next;
    });
  };
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    const fetchProjects = async () => {
      const {
        data
      } = await supabase.from('projects').select('id, name, icon_emoji, icon_color').eq('status', 'active').order('name');
      setProjects(data || []);
    };
    const fetchProfile = async () => {
      if (!user) return;
      const {
        data
      } = await supabase.from('profiles').select('first_name, last_name, full_name, email, avatar_url, subscription_status, is_admin').eq('user_id', user.id).single();
      setProfile(data);
    };
    if (user) {
      fetchProjects();
      fetchProfile();
    }
  }, [user]);
  useEffect(() => {
    if (location.pathname.startsWith('/projects')) {
      setProjectsOpen(true);
    }
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
  const [timeOpen, setTimeOpen] = useState(false);
  const isTimeActive = location.pathname.startsWith('/time');
  const isOnTrial = profile?.subscription_status === 'trial';
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(() => {
    try { return localStorage.getItem('trial_banner_dismissed') === 'true'; } catch { return false; }
  });
  const showTrialBanner = isOnTrial && !trialBannerDismissed;
  const handleTrialBannerDismiss = () => {
    setTrialBannerDismissed(true);
    try { localStorage.setItem('trial_banner_dismissed', 'true'); } catch {}
  };
  const timer = useTimer();
  const showTimerBar = timer.draftSegments.length > 0;
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Trial Banner – when dismissed, sidebar lifts to top (no blank space) */}
      {showTrialBanner && <TrialBanner onUpgrade={() => navigate('/settings/subscription')} onDismiss={handleTrialBannerDismiss} />}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className={cn("fixed inset-0 z-40 bg-black/50 lg:hidden", showTrialBanner && "top-[40px]")} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn("fixed left-0 z-50 bg-sidebar border-r border-sidebar-border transform transition-all duration-200 lg:translate-x-0 flex flex-col", showTrialBanner ? "top-[40px] h-[calc(100vh-40px)]" : "top-0 h-screen", sidebarOpen ? "translate-x-0" : "-translate-x-full", sidebarCollapsed ? "w-16" : "w-64")}>
        {/* Logo Header: when collapsed = logo on top, expand arrow below; when expanded = row */}
        <div className={cn("border-b border-sidebar-border pt-4", sidebarCollapsed ? "flex flex-col items-center gap-1 pb-2 px-1.5" : "flex h-[5rem] items-center justify-between px-4")}>
          {(() => {
            const size = branding?.logo_size === 'sm' || branding?.logo_size === 'lg' ? branding.logo_size : 'md';
            const iconSize = sidebarCollapsed ? 'h-7 w-7' : { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' }[size];
            const logoWidthPx = branding?.logo_width != null && branding.logo_width >= 24 && branding.logo_width <= 400
              ? branding.logo_width
              : 120;
            return sidebarCollapsed ? (
              <Link to="/dashboard" className="flex shrink-0 justify-center" onClick={() => setSidebarOpen(false)}>
                {branding?.icon_url ? (
                  <img src={branding.icon_url} alt="Lance" className={cn('rounded-lg object-contain', iconSize)} />
                ) : (
                  <Briefcase className={cn('text-primary', iconSize)} />
                )}
              </Link>
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
          <Button variant="ghost" size="icon" className={cn("text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0", sidebarCollapsed ? "h-6 w-6 lg:flex" : "h-8 w-8 hidden lg:flex")} onClick={toggleSidebarCollapsed}>
            <ChevronLeft className={cn("transition-transform", sidebarCollapsed ? "h-3 w-3 rotate-180" : "h-4 w-4")} />
          </Button>
        </div>

        {/* Navigation - order: Dashboard, Clients, Projects, Time, Invoices, Reviews */}
        <nav className={cn("flex-1 overflow-y-auto space-y-1", sidebarCollapsed ? "p-2" : "p-3")}>
          <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/dashboard' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <LayoutDashboard className={cn("h-5 w-5 shrink-0", location.pathname === '/dashboard' && "text-primary")} />
            {!sidebarCollapsed && 'Dashboard'}
          </Link>
          <Link to="/clients" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/clients' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <Users className={cn("h-5 w-5 shrink-0", location.pathname === '/clients' && "text-primary")} />
            {!sidebarCollapsed && 'Clients'}
          </Link>

          {/* Projects: when collapsed = single link (same size as others); when expanded = dropdown */}
          {sidebarCollapsed ? (
            <Link to="/projects" onClick={() => setSidebarOpen(false)} className={cn("flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors", isProjectsActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <FolderKanban className={cn("h-5 w-5 shrink-0", isProjectsActive && "text-primary")} />
            </Link>
          ) : (
            <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
              <CollapsibleTrigger asChild>
                <button className={cn("flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", isProjectsActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                  <div className="flex items-center gap-3">
                    <FolderKanban className={cn("h-5 w-5 shrink-0", isProjectsActive && "text-primary")} />
                    Projects
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", projectsOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-1 mt-1">
                <Link to="/projects" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/projects' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  All Projects
                </Link>
                {projects.slice(0, 5).map(project => <Link key={project.id} to={`/projects/${project.id}`} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors truncate", location.pathname === `/projects/${project.id}` ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  <span>{project.icon_emoji || '📁'}</span>
                  <span className="truncate">{project.name}</span>
                </Link>)}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Time with sub-items: Timer, Logs */}
          {sidebarCollapsed ? (
            <Link to="/time/timer" onClick={() => setSidebarOpen(false)} className={cn("flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors", isTimeActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <Clock className={cn("h-5 w-5 shrink-0", isTimeActive && "text-primary")} />
            </Link>
          ) : (
            <Collapsible open={timeOpen} onOpenChange={setTimeOpen}>
              <CollapsibleTrigger asChild>
                <button className={cn("flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", isTimeActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                  <div className="flex items-center gap-3">
                    <Clock className={cn("h-5 w-5 shrink-0", isTimeActive && "text-primary")} />
                    Time
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", timeOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-1 mt-1">
                <Link to="/time/timer" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/time/timer' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  Timer
                </Link>
                <Link to="/time/logs" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/time/logs' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  Logs
                </Link>
              </CollapsibleContent>
            </Collapsible>
          )}
          <Link to="/invoices" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/invoices' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <FileText className={cn("h-5 w-5 shrink-0", location.pathname === '/invoices' && "text-primary")} />
            {!sidebarCollapsed && 'Invoices'}
          </Link>
          <Link to="/reviews" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/reviews' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <Eye className={cn("h-5 w-5 shrink-0", location.pathname === '/reviews' && "text-primary")} />
            {!sidebarCollapsed && 'Reviews'}
          </Link>
        </nav>

        {/* Bottom section */}
        <div className={cn("space-y-2 border-t border-sidebar-border", sidebarCollapsed ? "p-2" : "p-3")}>
          {/* Notifications */}
          <Link to="/notifications" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", sidebarCollapsed && "justify-center px-2", location.pathname === '/notifications' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <Bell className={cn("h-5 w-5 shrink-0", location.pathname === '/notifications' && "text-primary")} />
            {!sidebarCollapsed && 'Notifications'}
          </Link>

          {/* Upgrade Button - only show for trial/free users */}
          {!sidebarCollapsed && isOnTrial && (
            <Link to="/settings/subscription" className="upgrade-gradient rounded-lg p-3 block hover:opacity-90 transition-opacity">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-sidebar-foreground truncate">Billing</span>
                </div>
                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
              </div>
            </Link>
          )}

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
                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5">
                  {profile?.subscription_status === 'active' ? 'Business' : profile?.subscription_status === 'trial' ? 'Trial' : 'Free Plan'}
                </span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/business" className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  Company Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/invoices" className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Invoice Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/locale" className="cursor-pointer">
                  <Globe className="mr-2 h-4 w-4" />
                  Personal Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/notifications" className="cursor-pointer">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help" className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help Center
                </Link>
              </DropdownMenuItem>
              {profile?.is_admin === true && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="cursor-pointer">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/settings/subscription" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & Subscription
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/storage" className="cursor-pointer">
                  <HardDrive className="mr-2 h-4 w-4" />
                  Storage
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-200", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64", showTimerBar && "pb-14")}>
        {/* Mobile top bar only - hidden on desktop to avoid empty white box */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/80 backdrop-blur-md px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="ml-auto">
            <Bell className="h-5 w-5" />
          </Button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Persistent timer bar when timer has unsaved time */}
      <TimerBar />
    </div>;
}