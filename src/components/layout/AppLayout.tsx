import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutDashboard, Users, User, FolderKanban, Clock, FileText, LogOut, Menu, ChevronDown, ChevronLeft, Bell, Sparkles, ArrowRight, ChevronUp, Eye, Building2, Globe, CreditCard, HardDrive, HelpCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrialBanner } from './TrialBanner';
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
  const {
    user,
    signOut
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Trial Banner */}
      {isOnTrial && <TrialBanner onUpgrade={() => navigate('/settings/subscription')} />}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className={cn("fixed inset-0 z-40 bg-black/50 lg:hidden", isOnTrial && "top-[40px]")} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn("fixed left-0 z-50 bg-sidebar border-r border-sidebar-border transform transition-all duration-200 lg:translate-x-0 flex flex-col", isOnTrial ? "top-[40px] h-[calc(100vh-40px)]" : "top-0 h-screen", sidebarOpen ? "translate-x-0" : "-translate-x-full", sidebarCollapsed ? "w-16" : "w-64")}>
        {/* Logo Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {sidebarCollapsed ? (
            <Link to="/dashboard" className="flex flex-1 justify-center lg:justify-start" onClick={() => setSidebarOpen(false)}>
              <img src="/lance-icon.png" alt="Lance" className="h-9 w-9 rounded-lg object-contain shrink-0" />
            </Link>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-2 min-w-0" onClick={() => setSidebarOpen(false)}>
              <img src="/lance-logo.png" alt="Lance" className="h-8 object-contain object-left" />
            </Link>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hidden lg:flex shrink-0" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation - order: Dashboard, Clients, Projects, Time, Invoices, Reviews */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", location.pathname === '/dashboard' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <LayoutDashboard className={cn("h-5 w-5", location.pathname === '/dashboard' && "text-primary")} />
            {!sidebarCollapsed && 'Dashboard'}
          </Link>
          <Link to="/clients" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", location.pathname === '/clients' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <Users className={cn("h-5 w-5", location.pathname === '/clients' && "text-primary")} />
            {!sidebarCollapsed && 'Clients'}
          </Link>

          {/* Projects with expandable dropdown */}
          <Collapsible open={projectsOpen && !sidebarCollapsed} onOpenChange={setProjectsOpen}>
            <CollapsibleTrigger asChild>
              <button className={cn("flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", isProjectsActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                <div className="flex items-center gap-3">
                  <FolderKanban className={cn("h-5 w-5", isProjectsActive && "text-primary")} />
                  {!sidebarCollapsed && "Projects"}
                </div>
                {!sidebarCollapsed && <ChevronDown className={cn("h-4 w-4 transition-transform", projectsOpen && "rotate-180")} />}
              </button>
            </CollapsibleTrigger>
            {!sidebarCollapsed && <CollapsibleContent className="pl-8 space-y-1 mt-1">
                <Link to="/projects" onClick={() => setSidebarOpen(false)} className={cn("block px-3 py-2 rounded-lg text-sm transition-colors", location.pathname === '/projects' ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                  All Projects
                </Link>
                {projects.slice(0, 5).map(project => <Link key={project.id} to={`/projects/${project.id}`} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors truncate", location.pathname === `/projects/${project.id}` ? "text-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                    <span>{project.icon_emoji || '📁'}</span>
                    <span className="truncate">{project.name}</span>
                  </Link>)}
              </CollapsibleContent>}
          </Collapsible>

          {/* Time with sub-items: Timer, Logs */}
          {sidebarCollapsed ? (
            <Link to="/time/timer" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", isTimeActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <Clock className={cn("h-5 w-5", isTimeActive && "text-primary")} />
            </Link>
          ) : (
            <Collapsible open={timeOpen} onOpenChange={setTimeOpen}>
              <CollapsibleTrigger asChild>
                <button className={cn("flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", isTimeActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                  <div className="flex items-center gap-3">
                    <Clock className={cn("h-5 w-5", isTimeActive && "text-primary")} />
                    Time
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", timeOpen && "rotate-180")} />
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
          <Link to="/invoices" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", location.pathname === '/invoices' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <FileText className={cn("h-5 w-5", location.pathname === '/invoices' && "text-primary")} />
            {!sidebarCollapsed && 'Invoices'}
          </Link>
          <Link to="/reviews" onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", location.pathname === '/reviews' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            <Eye className={cn("h-5 w-5", location.pathname === '/reviews' && "text-primary")} />
            {!sidebarCollapsed && 'Reviews'}
          </Link>
        </nav>

        {/* Bottom section */}
        <div className="p-3 space-y-2 border-t border-sidebar-border">
          {/* Notifications */}
          {!sidebarCollapsed && <Link to="/notifications" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
              <Bell className="h-5 w-5" />
              Notifications
            </Link>}

          {/* Upgrade Button - only show for trial/free users */}
          {!sidebarCollapsed && isOnTrial && (
            <Link to="/settings/subscription" className="upgrade-gradient rounded-lg p-3 block hover:opacity-90 transition-opacity">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-sidebar-foreground truncate">Upgrade now</span>
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
      <div className={cn("flex-1 transition-all duration-200", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
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
    </div>;
}