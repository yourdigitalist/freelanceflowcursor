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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FolderKanban, Calendar, Clock, MoreVertical, Pencil, Trash2, LayoutGrid, List, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { downloadCsv, getTasksTemplateRows, TASKS_CSV_HEADERS, parseCsv } from '@/lib/csv';

interface Client {
  id: string;
  name: string;
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

const ICON_COLORS = [
  '#9B63E9', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'
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
  const [selectedEmoji, setSelectedEmoji] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('#9B63E9');
  const [exportTasksDialogOpen, setExportTasksDialogOpen] = useState(false);
  const [exportTaskProjectId, setExportTaskProjectId] = useState<string>('all');
  const [exportingTasks, setExportingTasks] = useState(false);
  const [importTasksDialogOpen, setImportTasksDialogOpen] = useState(false);
  const [importTaskProjectId, setImportTaskProjectId] = useState<string>('');
  const [importingTasks, setImportingTasks] = useState(false);
  const importTaskFileRef = useRef<HTMLInputElement>(null);

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
      setSelectedEmoji(projectToEdit.icon_emoji || '📁');
      setSelectedColor(projectToEdit.icon_color || '#9B63E9');
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
            .select('duration_minutes')
            .eq('project_id', project.id);

          const hours = (timeData?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0) / 60;

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
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const projectData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      status: formData.get('status') as string,
      budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : null,
      hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate') as string) : null,
      start_date: formData.get('start_date') as string || null,
      due_date: formData.get('due_date') as string || null,
      client_id: (formData.get('client_id') as string) === 'none' ? null : (formData.get('client_id') as string) || null,
      icon_emoji: selectedEmoji,
      icon_color: selectedColor,
      user_id: user!.id,
    };

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id);
        if (error) throw error;
        toast({ title: 'Project updated successfully' });
      } else {
        const { error } = await supabase
          .from('projects')
          .insert(projectData);
        if (error) throw error;
        toast({ title: 'Project created successfully' });
      }
      
      setIsDialogOpen(false);
      setEditingProject(null);
      setSelectedEmoji('📁');
      setSelectedColor('#9B63E9');
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error saving project',
        description: error.message,
        variant: 'destructive',
      });
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
    setSelectedEmoji(project.icon_emoji || '📁');
    setSelectedColor(project.icon_color || '#9B63E9');
    setIsDialogOpen(true);
  };

  const handleDownloadTaskTemplate = () => {
    downloadCsv('tasks_template.csv', getTasksTemplateRows());
    toast({ title: 'Template downloaded' });
  };

  const handleExportAllTasks = async () => {
    if (!user) return;
    setExportingTasks(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*, projects(name)')
        .order('created_at', { ascending: false });
      if (exportTaskProjectId !== 'all') {
        query = query.eq('project_id', exportTaskProjectId);
      }
      const { data: tasksData, error } = await query;
      if (error) throw error;
      const tasks = (tasksData || []) as Array<{ project_id: string; title: string; description: string | null; status: string; status_id: string | null; priority: string | null; due_date: string | null; estimated_hours: number | null; projects: { name: string } | null }>;
      const projectIds = [...new Set(tasks.map((t) => t.project_id))];
      const { data: statusesData } = await supabase.from('project_statuses').select('id, name').in('project_id', projectIds);
      const statusIdToName = new Map<string, string>();
      (statusesData || []).forEach((s: { id: string; name: string }) => statusIdToName.set(s.id, s.name));
      const rows = [
        TASKS_CSV_HEADERS,
        ...tasks.map((t) => [
          t.title,
          t.description ?? '',
          (t.status_id && statusIdToName.get(t.status_id)) ?? t.status ?? '',
          t.priority ?? '',
          t.due_date ?? '',
          String(t.estimated_hours ?? ''),
          (t.projects as { name: string } | null)?.name ?? '',
        ]),
      ];
      downloadCsv(`tasks_export_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
      toast({ title: `Exported ${tasks.length} tasks` });
      setExportTasksDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Export failed', description: err?.message, variant: 'destructive' });
    } finally {
      setExportingTasks(false);
    }
  };

  const handleImportTasksCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !importTaskProjectId) return;
    setImportingTasks(true);
    try {
      const { data: statusesData } = await supabase
        .from('project_statuses')
        .select('id, name')
        .eq('project_id', importTaskProjectId)
        .order('position');
      const statuses = statusesData || [];
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', importTaskProjectId);
      let position = count ?? 0;

      const rows = await parseCsv(file);
      if (rows.length < 2) {
        toast({ title: 'No data rows in file', variant: 'destructive' });
        return;
      }
      const header = rows[0].map((h) => h.toLowerCase().replace(/\s/g, '_'));
      const dataRows = rows.slice(1);
      const titleIdx = header.indexOf('title');
      const descIdx = header.indexOf('description');
      const statusIdx = header.indexOf('status');
      const priorityIdx = header.indexOf('priority');
      const dueDateIdx = header.indexOf('due_date');
      const estIdx = header.indexOf('estimated_hours');
      if (titleIdx === -1) {
        toast({ title: 'CSV must have title column', variant: 'destructive' });
        return;
      }
      let created = 0;
      for (const row of dataRows) {
        const title = row[titleIdx]?.trim();
        if (!title) continue;
        const description = descIdx >= 0 ? row[descIdx]?.trim() || null : null;
        const statusName = statusIdx >= 0 ? row[statusIdx]?.trim() : '';
        const statusId = statusName ? statuses.find((s: { name: string }) => s.name === statusName)?.id ?? null : statuses[0]?.id ?? null;
        const priority = (priorityIdx >= 0 ? row[priorityIdx]?.trim() : 'medium') || 'medium';
        const dueDate = dueDateIdx >= 0 ? row[dueDateIdx]?.trim() || null : null;
        const estimatedHours = estIdx >= 0 ? (parseFloat(row[estIdx]) || null) : null;
        const { error } = await supabase.from('tasks').insert({
          title,
          description,
          status_id: statusId,
          priority,
          due_date: dueDate || null,
          estimated_hours: estimatedHours,
          project_id: importTaskProjectId,
          user_id: user.id,
          position,
          status: 'todo',
        });
        if (!error) {
          created++;
          position++;
        }
      }
      setImportTasksDialogOpen(false);
      setImportTaskProjectId('');
      if (importTaskFileRef.current) importTaskFileRef.current.value = '';
      toast({ title: `Imported ${created} tasks` });
    } catch (err: any) {
      toast({ title: 'Import failed', description: err?.message, variant: 'destructive' });
    } finally {
      setImportingTasks(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your active and completed projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadTaskTemplate}>
                  Download task template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExportTasksDialogOpen(true)}>
                  Export all tasks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportTasksDialogOpen(true)}>
                  Import tasks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingProject(null);
              setSelectedEmoji('📁');
              setSelectedColor('#9B63E9');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Update project details' : 'Set up a new project'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Icon Selector */}
                <div className="space-y-2">
                  <Label>Project Icon</Label>
                  <div className="flex items-center gap-3">
                    <EmojiPicker value={selectedEmoji} onChange={setSelectedEmoji}>
                      <button
                        type="button"
                        className="h-12 w-12 rounded-lg flex items-center justify-center text-xl cursor-pointer border-2 border-border hover:border-primary transition-colors"
                        style={{ backgroundColor: selectedColor }}
                      >
                        {selectedEmoji}
                      </button>
                    </EmojiPicker>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">Click the icon to choose an emoji</p>
                      <div className="flex gap-1">
                        {ICON_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                              "h-6 w-6 rounded-full transition-transform",
                              selectedColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProject?.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
                  <Select name="client_id" defaultValue={editingProject?.client_id || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingProject?.description || ''}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget ($)</Label>
                    <Input
                      id="budget"
                      name="budget"
                      type="number"
                      step="0.01"
                      defaultValue={editingProject?.budget || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate"
                      name="hourly_rate"
                      type="number"
                      step="0.01"
                      defaultValue={editingProject?.hourly_rate || ''}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      defaultValue={editingProject?.start_date || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      name="due_date"
                      type="date"
                      defaultValue={editingProject?.due_date || ''}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingProject?.status || 'active'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProject ? 'Update' : 'Create'} Project
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Dialog open={exportTasksDialogOpen} onOpenChange={setExportTasksDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export tasks to CSV</DialogTitle>
              <DialogDescription>
                Choose a project to export only that project&apos;s tasks, or export all tasks.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={exportTaskProjectId} onValueChange={setExportTaskProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={exportingTasks} onClick={handleExportAllTasks}>
                {exportingTasks ? 'Exporting…' : 'Export CSV'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={importTasksDialogOpen} onOpenChange={setImportTasksDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import tasks from CSV</DialogTitle>
              <DialogDescription>
                Select a project and choose a CSV file. Tasks will be added to that project. Use the task template for the correct format.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={importTaskProjectId} onValueChange={setImportTaskProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input
                ref={importTaskFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportTasksCsv}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={importingTasks || !importTaskProjectId}
                onClick={() => importTaskFileRef.current?.click()}
              >
                {importingTasks ? 'Importing…' : 'Choose CSV file'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(project);
                          }}>
                            <Pencil className="mr-2 h-4 w-4" />
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
                  <p className="text-sm text-muted-foreground mb-3">
                    {project.clients?.name || 'No client'}
                  </p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {project.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(project.due_date), 'MMM d')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {(project.hours || 0).toFixed(1)}h
                      </span>
                    </div>
                    <span>{project.task_count || 0} tasks</span>
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
                    <p className="text-sm text-muted-foreground truncate">
                      {project.clients?.name || 'No client'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {project.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(project.due_date), 'MMM d')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
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
