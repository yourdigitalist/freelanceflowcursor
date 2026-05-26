import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, MoreVertical, Trash2, LayoutGrid, List, Download, Upload, Calendar, Clock } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { downloadCsv, getProjectsTemplateRows, PROJECTS_CSV_HEADERS, parseCsv } from '@/lib/csv';
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { formatLocaleDate } from '@/lib/datetime';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';

interface Client {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: number | null;
  hourly_rate: number | null;
  start_date: string | null;
  due_date: string | null;
  client_id: string | null;
  clients: Client | null;
  created_at: string;
  icon_emoji: string | null;
  icon_color: string | null;
  hours?: number;
  task_count?: number;
}

const PROJECT_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectClientId, setNewProjectClientId] = useState<string | null>(null);
  const [importProjectsDialogOpen, setImportProjectsDialogOpen] = useState(false);
  const [importingProjects, setImportingProjects] = useState(false);
  const projectsCsvInputRef = useRef<HTMLInputElement>(null);
  const { dateFormat } = useLocalePreferences();

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchClients();
    }
  }, [user]);

  // Open new project dialog when navigating from dashboard "New Project" / "Create your first project"
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsDialogOpen(true);
      setEditingProject(null);
      setNewProjectClientId(searchParams.get('client') || null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Open edit project dialog when navigating from project detail "Edit Project"
  const editId = searchParams.get('edit');
  useEffect(() => {
    if (!editId || projects.length === 0) return;
    const projectToEdit = projects.find((p) => p.id === editId);
    if (projectToEdit) {
      setEditingProject(projectToEdit);
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [editId, projects, setSearchParams]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get task counts and hours for each project
      const projectsWithData = await Promise.all(
        (data || []).map(async (project) => {
          const { count } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          const { data: timeData } = await supabase
            .from('time_entries')
            .select('duration_minutes, total_duration_seconds')
            .eq('project_id', project.id);

          const toHours = (e: { duration_minutes?: number | null; total_duration_seconds?: number | null }) =>
            e.total_duration_seconds != null ? e.total_duration_seconds / 3600 : (e.duration_minutes || 0) / 60;
          const hours = timeData?.reduce((sum, entry) => sum + toHours(entry), 0) || 0;

          return {
            ...project,
            task_count: count || 0,
            hours,
          };
        })
      );

      setProjects(projectsWithData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, company')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Project deleted successfully' });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error deleting project',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'completed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'on_hold':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const downloadProjectsTemplate = () => {
    downloadCsv('projects_template.csv', getProjectsTemplateRows());
    toast({ title: 'Template downloaded' });
  };

  const exportProjectsCsv = () => {
    const clientName = (p: Project) => (p.clients as { name?: string } | null)?.name ?? '';
    const rows = [
      PROJECTS_CSV_HEADERS,
      ...filteredProjects.map((p) => [
        p.name ?? '',
        clientName(p),
        p.description ?? '',
        p.status ?? 'active',
        p.budget != null ? String(p.budget) : '',
        p.hourly_rate != null ? String(p.hourly_rate) : '',
        p.start_date ?? '',
        p.due_date ?? '',
      ]),
    ];
    downloadCsv(`projects_export_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: `Exported ${filteredProjects.length} project(s)` });
  };

  const handleImportProjectsCsv = async (file: File) => {
    if (!user) return;
    setImportingProjects(true);
    setImportProjectsDialogOpen(false);
    try {
      const rows = await parseCsv(file);
      if (rows.length < 2) {
        toast({ title: 'No data rows', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' });
        return;
      }
      const headerRow = rows[0].map((h) => String(h).trim().toLowerCase().replace(/\s/g, '_'));
      const get = (key: string) => {
        const i = headerRow.indexOf(key.toLowerCase());
        return i >= 0 ? (row: string[]) => (row[i] ?? '').trim() : () => '';
      };
      let created = 0;
      const errors: string[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const name = get('name')(row);
        if (!name) {
          errors.push(`Row ${r + 1}: name required`);
          continue;
        }
        const rawStatus = get('status')(row) || 'active';
        const normalizedStatus = PROJECT_STATUSES.some((s) => s.value === rawStatus.toLowerCase())
          ? rawStatus.toLowerCase()
          : PROJECT_STATUSES.find((s) => s.label.toLowerCase() === rawStatus.toLowerCase())?.value ?? 'active';
        const clientName = get('client_name')(row);
        const clientId = clientName ? (clients.find((c) => c.name === clientName)?.id ?? null) : null;
        const budgetVal = get('budget')(row);
        const budget = budgetVal ? parseFloat(budgetVal) || null : null;
        const rateVal = get('hourly_rate')(row);
        const hourlyRate = rateVal ? parseFloat(rateVal) || null : null;
        const startDate = get('start_date')(row) || null;
        const dueDate = get('due_date')(row) || null;
        const projectData = {
          name,
          description: get('description')(row) || null,
          status: normalizedStatus,
          budget,
          hourly_rate: hourlyRate,
          start_date: startDate ? new Date(startDate).toISOString().slice(0, 10) : null,
          due_date: dueDate ? new Date(dueDate).toISOString().slice(0, 10) : null,
          client_id: clientId,
          icon_emoji: '📁',
          icon_color: '#9B63E9',
          user_id: user.id,
        };
        const { error } = await supabase.from('projects').insert(projectData);
        if (error) {
          errors.push(`Row ${r + 1}: ${error.message}`);
        } else {
          created++;
        }
      }
      if (projectsCsvInputRef.current) projectsCsvInputRef.current.value = '';
      fetchProjects();
      if (created > 0) {
        toast({ title: 'Import complete', description: `Created ${created} project(s).${errors.length ? ` ${errors.length} error(s).` : ''}` });
      }
      if (errors.length > 0 && created === 0) {
        toast({ title: 'Import failed', description: errors.slice(0, 3).join(' '), variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Import error', description: err.message, variant: 'destructive' });
    } finally {
      setImportingProjects(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={projectsCsvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportProjectsCsv(f);
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="Template, export, or import CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadProjectsTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportProjectsCsv} disabled={filteredProjects.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportProjectsDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={importProjectsDialogOpen} onOpenChange={setImportProjectsDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Import projects from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Download the <strong className="text-foreground">Template</strong> to get the correct column headers.</p>
                  <p>2. Fill in your project data. <strong className="text-foreground">Name</strong> is required. Use <strong className="text-foreground">client_name</strong> to link a project to a client (must match an existing client name exactly).</p>
                  <p>3. In the <strong className="text-foreground">status</strong> column, use one of these values:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                    {PROJECT_STATUSES.map((s) => (
                      <li key={s.value}><code className="text-xs bg-muted px-1 rounded">{s.value}</code> — {s.label}</li>
                    ))}
                  </ul>
                  <p>4. Save as CSV and choose your file below.</p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" size="sm" onClick={() => { downloadProjectsTemplate(); setImportProjectsDialogOpen(false); }}>
                    <Download className="mr-2 h-4 w-4" />
                    Template
                  </Button>
                  <Button size="sm" onClick={() => projectsCsvInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose CSV file
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          <Button
            onClick={() => {
              setEditingProject(null);
              setNewProjectClientId(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <ProjectFormDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingProject(null);
                setNewProjectClientId(null);
              }
            }}
            editingProject={editingProject}
            clients={clients}
            initialClientId={newProjectClientId}
            onSaved={() => {
              fetchProjects();
              fetchClients();
            }}
            onClientSaved={(client) => {
              setClients((prev) =>
                [...prev.filter((item) => item.id !== client.id), client].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              );
            }}
          />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Projects */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: project.icon_color || '#9B63E9' }}
                    >
                      {project.icon_emoji || '📁'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={getStatusColor(project.status)}>
                        {formatStatus(project.status)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(project);
                          }}>
                            <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(project.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <h3 className="font-semibold text-primary mb-1">{project.name}</h3>
                  <div className="mb-3">
                    {project.clients ? (
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${project.clients?.id}`);
                        }}
                      >
                        {project.clients.name}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">No client</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-1 py-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(project);
                          }}
                        >
                          + Add client
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {project.due_date && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          <span>{formatLocaleDate(project.due_date, dateFormat)}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span>{(project.hours || 0).toFixed(1)}h</span>
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">{project.task_count || 0} tasks</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: project.icon_color || '#9B63E9' }}
                  >
                    {project.icon_emoji || '📁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-primary truncate">{project.name}</h3>
                    {project.clients ? (
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${project.clients?.id}`);
                        }}
                      >
                        {project.clients.name}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">No client</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-1 py-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(project);
                          }}
                        >
                          + Add client
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {project.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        {formatLocaleDate(project.due_date, dateFormat)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      {(project.hours || 0).toFixed(1)}h
                    </span>
                    <span>{project.task_count || 0} tasks</span>
                    <Badge variant="outline" className={getStatusColor(project.status)}>
                      {formatStatus(project.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
