import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FolderKanban,
  DollarSign,
  Clock,
  Plus,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  pendingInvoices: number;
  pendingAmount: number;
  hoursThisMonth: number;
  unbilledHours: number;
}

interface RecentProject {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  icon_emoji: string | null;
  icon_color: string | null;
  due_date: string | null;
  hours: number;
  task_count: number;
}

interface RecentActivity {
  id: string;
  description: string;
  project_name: string;
  time_ago: string;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProjects: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
    hoursThisMonth: 0,
    unbilledHours: 0,
  });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null }>({ full_name: null });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user!.id)
      .single();
    if (data) setProfile(data);
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch active projects count
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch pending invoices
      const { count: invoicesCount, data: pendingInvoices } = await supabase
        .from('invoices')
        .select('total')
        .in('status', ['sent', 'draft']);

      const pendingAmount = pendingInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

      // Fetch time entries for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('duration_minutes, billable')
        .gte('start_time', startOfMonth.toISOString());

      const hoursThisMonth = (timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0) / 60;
      const unbilledHours = (timeEntries?.filter(e => e.billable === false).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0) / 60;

      // Fetch recent projects with task counts
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          icon_emoji,
          icon_color,
          due_date,
          clients(name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      // Get task counts for each project
      const projectsWithTasks = await Promise.all(
        (projects || []).map(async (p: any) => {
          const { count } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', p.id);

          const { data: projectTime } = await supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('project_id', p.id);

          const hours = (projectTime?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0) / 60;

          return {
            id: p.id,
            name: p.name,
            client_name: p.clients?.name || null,
            status: p.status,
            icon_emoji: p.icon_emoji,
            icon_color: p.icon_color,
            due_date: p.due_date,
            hours,
            task_count: count || 0,
          };
        })
      );

      // Fetch recent time entries for activity
      const { data: recentTimeEntries } = await supabase
        .from('time_entries')
        .select(`
          id,
          description,
          duration_minutes,
          created_at,
          projects(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const activities = (recentTimeEntries || []).map((entry: any) => ({
        id: entry.id,
        description: `${(entry.duration_minutes / 60).toFixed(1)}h logged on ${entry.projects?.name || 'Unknown Project'}`,
        project_name: entry.projects?.name || 'Unknown',
        time_ago: getTimeAgo(new Date(entry.created_at)),
      }));

      // Fetch recent invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, status')
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({
        totalClients: clientsCount || 0,
        activeProjects: projectsCount || 0,
        pendingInvoices: invoicesCount || 0,
        pendingAmount,
        hoursThisMonth,
        unbilledHours,
      });

      setRecentProjects(projectsWithTasks);
      setRecentActivity(activities);
      setRecentInvoices(invoices || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'paid':
        return 'bg-success/10 text-success border-success/20';
      case 'sent':
        return 'bg-muted text-muted-foreground border-muted';
      case 'draft':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const firstName = profile.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const statCards = [
    {
      title: 'Active Clients',
      value: stats.totalClients,
      subtitle: `${stats.totalClients} total`,
      icon: Users,
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      subtitle: `${stats.activeProjects} total`,
      icon: FolderKanban,
    },
    {
      title: 'Hours This Month',
      value: stats.hoursThisMonth.toFixed(1),
      subtitle: `${stats.unbilledHours.toFixed(1)}h unbilled`,
      icon: Clock,
    },
    {
      title: 'Pending Payment',
      value: `$${stats.pendingAmount.toLocaleString()}`,
      subtitle: `${stats.pendingInvoices} invoices`,
      icon: DollarSign,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{getGreeting()}, {firstName}!</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your business.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/time">
                <Clock className="mr-2 h-4 w-4" />
                Log Time
              </Link>
            </Button>
            <Button asChild>
              <Link to="/projects?new=1">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Projects - spans 2 columns */}
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-primary">
                <Link to="/projects">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active projects</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link to="/projects?new=1">Create your first project</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-lg"
                          style={{ backgroundColor: project.icon_color || '#9B63E9' }}
                        >
                          {project.icon_emoji || '📁'}
                        </div>
                        <Badge variant="outline" className={getStatusBadgeStyle(project.status)}>
                          {formatStatus(project.status)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-primary mb-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {project.client_name || 'No client'}
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-3">
                          {project.due_date && (
                            <span className="flex items-center gap-1">
                              📅 {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            ⏱️ {project.hours.toFixed(1)}h
                          </span>
                        </div>
                        <span>{project.task_count} tasks</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.time_ago}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Review Requests */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">Review Requests</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-primary">
                <Link to="/reviews">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold">0</span>
                <span className="text-sm text-muted-foreground">Total reviews</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-muted">0 pending</Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">0 approved</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-primary">
                <Link to="/invoices">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold">{recentInvoices.length}</span>
                <span className="text-sm text-muted-foreground">Total invoices</span>
              </div>
              <div className="flex gap-2 mb-4">
                <Badge variant="outline" className="bg-muted">
                  {recentInvoices.filter(i => i.status === 'sent').length} sent
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {recentInvoices.filter(i => i.status === 'paid').length} paid
                </Badge>
              </div>
              {recentInvoices.length > 0 && (
                <div className="space-y-2">
                  {recentInvoices.slice(0, 2).map((invoice) => (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">${invoice.total?.toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusBadgeStyle(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
