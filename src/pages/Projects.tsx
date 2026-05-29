import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ViewToggle, ViewToggleButton } from '@/components/ui/view-toggle';
import { PageSearchInput } from '@/components/ui/page-search-input';


import { Card, CardContent } from '@/components/ui/card';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Plus, LayoutGrid, List, Download, Upload, Filter } from '@/components/icons';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { downloadCsv, getProjectsTemplateRows, PROJECTS_CSV_HEADERS, parseCsv } from '@/lib/csv';
import { useLocalePreferences } from '@/hooks/useLocalePreferences';

import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectListCard, type ProjectListCardData } from '@/components/projects/ProjectListCard';
import { ProjectsTable } from '@/components/projects/ProjectsTable';
import { TablePagination } from '@/components/ui/table-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useProfileCurrency } from '@/hooks/useProfileCurrency';

interface Client {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
}

type Project = ProjectListCardData & {
  description: string | null;
  created_at: string;
};

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
  const { formatCurrency: formatMoney } = useProfileCurrency();

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
          clients(id, name, first_name, last_name, avatar_color, logo_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const toHours = (e: { duration_minutes?: number | null; total_duration_seconds?: number | null }) =>
        e.total_duration_seconds != null ? e.total_duration_seconds / 3600 : (e.duration_minutes || 0) / 60;

      const projectsWithData = await Promise.all(
        (data || []).map(async (project) => {
          const [{ data: taskRows }, { data: timeData }] = await Promise.all([
            supabase
              .from('tasks')
              .select('id, project_statuses!status_id(is_done_status)')
              .eq('project_id', project.id),
            supabase
              .from('time_entries')
              .select('duration_minutes, total_duration_seconds')
              .eq('project_id', project.id),
          ]);

          const task_count = taskRows?.length || 0;
          const completed_tasks = (taskRows || []).filter(
            (t) => (t.project_statuses as { is_done_status?: boolean } | null)?.is_done_status === true,
          ).length;
          const open_task_count = task_count - completed_tasks;

          const hours = timeData?.reduce((sum, entry) => sum + toHours(entry), 0) || 0;
          const client = project.clients as ProjectListCardData['clients'];

          return {
            ...project,
            clients: client
              ? {
                  name: client.name,
                  first_name: client.first_name,
                  last_name: client.last_name,
                  avatar_color: client.avatar_color,
                  logo_url: client.logo_url,
                }
              : null,
            task_count,
            completed_tasks,
            task_count,
            completed_tasks,
            open_task_count,
            hours,
          } satisfies Project;
        }),
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

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const activeFilterCount = statusFilter !== 'all' ? 1 : 0;
  const projectsPagination = usePagination(filteredProjects);

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

        {/* Search + View + Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageSearchInput
            placeholder="Search projects..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <div className="flex items-center gap-2">
            <ViewToggle>
              <ViewToggleButton
                active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </ViewToggleButton>
            </ViewToggle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative h-8 w-8 p-0" aria-label="Filters">
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-4" align="end">
                <div className="space-y-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
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
                  {activeFilterCount > 0 ? (
                    <Button variant="ghost" size="sm" className="h-8 w-full" onClick={() => setStatusFilter('all')}>
                      Reset filters
                    </Button>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
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
          <div className="space-y-4">
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projectsPagination.paginatedItems.map((project) => (
                <ProjectListCard
                  key={project.id}
                  project={project}
                  dateFormat={dateFormat}
                  formatMoney={formatMoney}
                  onNavigate={() => navigate(`/projects/${project.id}`)}
                />
              ))}
            </div>
            <TablePagination
              total={projectsPagination.total}
              page={projectsPagination.page}
              pageSize={projectsPagination.pageSize}
              from={projectsPagination.from}
              to={projectsPagination.to}
              pageSizeOptions={projectsPagination.pageSizeOptions}
              showPageSizeSelect={projectsPagination.showPageSizeSelect}
              onPageChange={projectsPagination.setPage}
              onPageSizeChange={projectsPagination.setPageSize}
            />
          </div>
        ) : (
          <Card className="border shadow-sm">
            <CardContent className="flex flex-col p-0">
              <ProjectsTable
                dateFormat={dateFormat}
                formatMoney={formatMoney}
                onRowClick={(id) => navigate(`/projects/${id}`)}
                pagination={projectsPagination}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
