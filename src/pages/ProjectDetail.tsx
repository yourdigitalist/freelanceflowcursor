import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfileCurrency } from '@/hooks/useProfileCurrency';
import { AppLayout } from '@/components/layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import {
  downloadCsv,
  parseCsv,
  getTasksTemplateRows,
  TASKS_CSV_HEADERS,
} from '@/lib/csv';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { Task, Project, ProjectStatus, DEFAULT_STATUSES } from '@/components/tasks/types';
import { ProjectHeader } from '@/components/tasks/ProjectHeader';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView';
import { TaskListView } from '@/components/tasks/TaskListView';
import { TaskEditSheet } from '@/components/tasks/TaskEditSheet';
import { StatusManagementModal } from '@/components/tasks/StatusManagementModal';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formatCurrency: fmt } = useProfileCurrency();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Data state
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);

  // UI state
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [hideDone, setHideDone] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importTaskDialogOpen, setImportTaskDialogOpen] = useState(false);
  const [importingTasks, setImportingTasks] = useState(false);
  const importTaskFileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Data fetching
  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          budget,
          due_date,
          start_date,
          hourly_rate,
          icon_emoji,
          icon_color,
          clients(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/projects');
        return;
      }
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  }, [id, navigate]);

  const fetchStatuses = useCallback(async () => {
    if (!id || !user) return;
    try {
      const { data, error } = await supabase
        .from('project_statuses')
        .select('*')
        .eq('project_id', id)
        .order('position');

      if (error) throw error;

      if (!data || data.length === 0) {
        // Create default statuses for this project
        const defaultStatuses = DEFAULT_STATUSES.map((s, i) => ({
          ...s,
          project_id: id,
          user_id: user.id,
          position: i,
        }));

        const { data: newStatuses, error: insertError } = await supabase
          .from('project_statuses')
          .insert(defaultStatuses)
          .select();

        if (insertError) throw insertError;
        setStatuses(newStatuses || []);
      } else {
        setStatuses(data);
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  }, [id, user]);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('position');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCommentCounts = useCallback(async () => {
    if (!id) return;
    try {
      const { data: taskIds } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', id);

      if (!taskIds || taskIds.length === 0) return;

      const counts: Record<string, number> = {};
      for (const { id: taskId } of taskIds) {
        const { count } = await supabase
          .from('task_comments')
          .select('*', { count: 'exact', head: true })
          .eq('task_id', taskId);
        counts[taskId] = count || 0;
      }
      setCommentCounts(counts);
    } catch (error) {
      console.error('Error fetching comment counts:', error);
    }
  }, [id]);

  const fetchTotalHours = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('project_id', id);

      if (error) throw error;
      const totalMinutes = data?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0;
      setTotalHours(totalMinutes / 60);
    } catch (error) {
      console.error('Error fetching total hours:', error);
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      fetchProject();
      fetchStatuses();
      fetchTasks();
      fetchCommentCounts();
      fetchTotalHours();
    }
  }, [user, id, fetchProject, fetchStatuses, fetchTasks, fetchCommentCounts, fetchTotalHours]);

  // Task operations
  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!user || !id) return;

    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            ...taskData,
            status: undefined, // Don't update legacy status field
          })
          .eq('id', editingTask.id);
        if (error) throw error;
        toast({ title: 'Task updated successfully' });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([{
            title: taskData.title || '',
            description: taskData.description,
            status_id: taskData.status_id,
            priority: taskData.priority || 'medium',
            due_date: taskData.due_date,
            estimated_hours: taskData.estimated_hours,
            project_id: id,
            user_id: user.id,
            position: tasks.length,
            status: 'todo',
          }]);
        if (error) throw error;
        toast({ title: 'Task created successfully' });
      }

      setIsSheetOpen(false);
      setEditingTask(null);
      fetchTasks();
      fetchCommentCounts();
    } catch (error: any) {
      toast({
        title: 'Error saving task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleQuickAddTask = async (title: string, statusId: string) => {
    if (!user || !id) return;

    try {
      const { error } = await supabase.from('tasks').insert([{
        title,
        status_id: statusId,
        status: 'todo',
        priority: 'medium',
        project_id: id,
        user_id: user.id,
        position: tasks.length,
      }]);

      if (error) throw error;
      toast({ title: 'Task created' });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error creating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (taskId: string, statusId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status_id: statusId })
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePriorityChange = async (taskId: string, priority: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority })
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTitleChange = async (taskId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEstHoursChange = async (taskId: string, hours: number | null) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ estimated_hours: hours })
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDueDateChange = async (taskId: string, date: string | null) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: date })
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast({ title: 'Task deleted successfully' });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditProject = () => {
    navigate(`/projects?edit=${id}`);
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all tasks.')) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Project deleted' });
      navigate('/projects');
    } catch (error: any) {
      toast({
        title: 'Error deleting project',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateTask = async (task: Task) => {
    if (!user || !id) return;

    try {
      const { error } = await supabase.from('tasks').insert({
        title: `${task.title} (copy)`,
        description: task.description,
        status_id: task.status_id,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        estimated_hours: task.estimated_hours,
        project_id: id,
        user_id: user.id,
        position: tasks.length,
      });

      if (error) throw error;
      toast({ title: 'Task duplicated' });
      setIsSheetOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error duplicating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Status operations
  const handleSaveStatuses = async (newStatuses: Omit<ProjectStatus, 'id' | 'project_id' | 'user_id'>[]) => {
    if (!user || !id) return;

    try {
      // Delete existing statuses
      await supabase.from('project_statuses').delete().eq('project_id', id);

      // Insert new statuses
      const statusesToInsert = newStatuses.map((s, i) => ({
        ...s,
        project_id: id,
        user_id: user.id,
        position: i,
      }));

      const { error } = await supabase.from('project_statuses').insert(statusesToInsert);
      if (error) throw error;

      toast({ title: 'Statuses updated' });
      fetchStatuses();
    } catch (error: any) {
      toast({
        title: 'Error saving statuses',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = async (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Check if dropped on a status column
    const overStatus = statuses.find((s) => s.id === over.id);
    if (overStatus && activeTask.status_id !== overStatus.id) {
      // Update task status immediately for visual feedback
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status_id: overStatus.id } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Check if dropped on a status column (for Kanban)
    const overStatus = statuses.find((s) => s.id === over.id);
    if (overStatus) {
      if (activeTask.status_id !== overStatus.id) {
        try {
          await supabase
            .from('tasks')
            .update({ status_id: overStatus.id })
            .eq('id', String(active.id));
          fetchTasks();
        } catch (error) {
          console.error('Error updating task status:', error);
          fetchTasks(); // Revert on error
        }
      }
      return;
    }

    // Handle reordering within same column/list
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(reorderedTasks);

      // Update positions in database
      try {
        for (let i = 0; i < reorderedTasks.length; i++) {
          await supabase
            .from('tasks')
            .update({ position: i })
            .eq('id', reorderedTasks[i].id);
        }
      } catch (error) {
        console.error('Error updating task positions:', error);
        fetchTasks(); // Revert on error
      }
    }
  };

  const handleDownloadTaskTemplate = () => {
    downloadCsv('tasks_template.csv', getTasksTemplateRows());
    toast({ title: 'Template downloaded' });
  };

  const handleExportTasksCsv = () => {
    const rows = [
      TASKS_CSV_HEADERS,
      ...filteredTasks.map((t) => [
        t.title,
        t.description ?? '',
        statuses.find((s) => s.id === t.status_id)?.name ?? t.status ?? '',
        t.priority ?? '',
        t.due_date ?? '',
        String(t.estimated_hours ?? ''),
        project?.name ?? '',
      ]),
    ];
    downloadCsv(`tasks_${project?.name ?? 'export'}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast({ title: `Exported ${filteredTasks.length} tasks` });
  };

  const handleImportTasksCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    setImportingTasks(true);
    try {
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
        const statusId = statusName ? statuses.find((s) => s.name === statusName)?.id ?? null : statuses[0]?.id ?? null;
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
          project_id: id,
          user_id: user.id,
          position: tasks.length + created,
          status: 'todo',
        });
        if (!error) created++;
      }
      setImportTaskDialogOpen(false);
      if (importTaskFileRef.current) importTaskFileRef.current.value = '';
      toast({ title: `Imported ${created} tasks` });
      fetchTasks();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err?.message, variant: 'destructive' });
    } finally {
      setImportingTasks(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (selectedStatus !== 'all' && task.status_id !== selectedStatus) return false;
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (hideDone) {
      const doneStatusIds = statuses.filter((s) => s.is_done_status).map((s) => s.id);
      if (task.status_id && doneStatusIds.includes(task.status_id)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </AppLayout>
    );
  }

  if (!project) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <ProjectHeader
          project={project}
          tasks={tasks}
          statuses={statuses}
          totalHours={totalHours}
          formatCurrency={fmt}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          onDownloadTaskTemplate={handleDownloadTaskTemplate}
          onExportTasksCsv={handleExportTasksCsv}
          onOpenImportTasks={() => setImportTaskDialogOpen(true)}
          exportTaskCount={filteredTasks.length}
        />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Tasks</h2>

          <TaskFilters
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            statuses={statuses}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedPriority={selectedPriority}
            onPriorityChange={setSelectedPriority}
            hideDone={hideDone}
            onHideDoneChange={setHideDone}
            onEditStatuses={() => setIsStatusModalOpen(true)}
            onAddTask={() => {
              setEditingTask(null);
              setIsSheetOpen(true);
            }}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {viewMode === 'kanban' ? (
              <TaskKanbanView
                tasks={filteredTasks}
                statuses={statuses}
                commentCounts={commentCounts}
                onTaskClick={(task) => {
                  setEditingTask(task);
                  setIsSheetOpen(true);
                }}
                onQuickAdd={handleQuickAddTask}
              />
            ) : (
              <TaskListView
                tasks={filteredTasks}
                statuses={statuses}
                commentCounts={commentCounts}
                onTaskClick={(task) => {
                  setEditingTask(task);
                  setIsSheetOpen(true);
                }}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onTitleChange={handleTitleChange}
                onEstHoursChange={handleEstHoursChange}
                onDueDateChange={handleDueDateChange}
                onDelete={handleDeleteTask}
                onDuplicate={handleDuplicateTask}
                onQuickAdd={handleQuickAddTask}
                defaultStatusId={statuses[0]?.id || ''}
              />
            )}
          </DndContext>
        </div>

        <TaskEditSheet
          task={editingTask}
          statuses={statuses}
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
          onDuplicate={handleDuplicateTask}
          onDelete={handleDeleteTask}
        />

        <StatusManagementModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          statuses={statuses}
          onSave={handleSaveStatuses}
          projectId={id ?? ''}
          userId={user?.id ?? ''}
        />

        <Dialog open={importTaskDialogOpen} onOpenChange={setImportTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import tasks from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV with columns: title, description, status, priority, due_date, estimated_hours, project_name. Use the template for the correct format. Tasks will be added to this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                disabled={importingTasks}
                onClick={() => importTaskFileRef.current?.click()}
              >
                {importingTasks ? 'Importing…' : 'Choose CSV file'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
