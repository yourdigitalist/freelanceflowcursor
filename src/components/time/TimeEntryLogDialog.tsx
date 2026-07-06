import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { notifyStartGuideRefresh } from '@/components/layout/startGuideUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Plus, Trash2, Check } from '@/components/icons';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/time';
import { resolveEffectiveHourlyRate } from '@/lib/billing';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';

interface Project {
  id: string;
  name: string;
  client_id: string | null;
  hourly_rate?: number | null;
}

interface Client {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
}

export interface TimeEntryLogDialogEntry {
  id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  started_at: string | null;
  total_duration_seconds: number | null;
  duration_minutes: number | null;
  billable: boolean;
  project_id: string | null;
  task_id: string | null;
}

interface DialogStartEndRange {
  start: string;
  end: string;
}

interface TimeEntryLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntryLogDialogEntry | null;
  defaultProjectId?: string;
  defaultTaskId?: string;
  defaultDate?: string;
  defaultHours?: string;
  lockProject?: boolean;
  /** When set, only projects for this client appear in the project picker. */
  restrictToClientId?: string;
  onSaved?: () => void;
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong');

export function TimeEntryLogDialog({
  open,
  onOpenChange,
  entry,
  defaultProjectId = '',
  defaultTaskId = '',
  defaultDate,
  defaultHours,
  lockProject = false,
  restrictToClientId,
  onSaved,
}: TimeEntryLogDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogProject, setDialogProject] = useState('');
  const [dialogTask, setDialogTask] = useState('');
  const [dialogTimeMode, setDialogTimeMode] = useState<'start_end' | 'manual'>('manual');
  const [dialogStartEndRanges, setDialogStartEndRanges] = useState<DialogStartEndRange[]>([{ start: '09:00', end: '17:00' }]);
  const [dialogHours, setDialogHours] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');
  const [dialogDate, setDialogDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogBillable, setDialogBillable] = useState(true);
  const [dialogProjectQuery, setDialogProjectQuery] = useState('');
  const [dialogTaskQuery, setDialogTaskQuery] = useState('');
  const [dialogProjectPopoverOpen, setDialogProjectPopoverOpen] = useState(false);
  const [dialogTaskPopoverOpen, setDialogTaskPopoverOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditing = Boolean(entry?.id);
  const isBusy = loadingSegments || deleting;
  const selectedDialogProject = projects.find((p) => p.id === dialogProject);
  const selectedDialogTask = tasks.find((t) => t.id === dialogTask);

  useEffect(() => {
    if (!open || !user) return;
    let projectQuery = supabase.from('projects').select('id, name, client_id, hourly_rate').order('name');
    if (restrictToClientId) {
      projectQuery = projectQuery.eq('client_id', restrictToClientId);
    }
    void projectQuery.then(({ data }) => setProjects(data || []));
    void supabase
      .from('clients')
      .select('id, name')
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => setClients(data || []));
  }, [open, user, restrictToClientId]);

  useEffect(() => {
    if (!dialogProject) {
      setTasks([]);
      return;
    }
    void supabase
      .from('tasks')
      .select('id, title, project_id')
      .eq('project_id', dialogProject)
      .order('title')
      .then(({ data }) => setTasks(data || []));
  }, [dialogProject]);

  useEffect(() => {
    if (!open) return;

    const resetForCreate = () => {
      setDialogProject(defaultProjectId || '');
      setDialogTask(defaultTaskId || '');
      setDialogTimeMode('manual');
      setDialogStartEndRanges([{ start: '09:00', end: '17:00' }]);
      setDialogHours(defaultHours ?? '');
      setDialogDescription('');
      setDialogDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      setDialogBillable(true);
    };

    if (!entry) {
      resetForCreate();
      return;
    }

    setDialogProject(entry.project_id || '');
    setDialogTask(entry.task_id || '');
    setDialogDescription(entry.description || '');
    setDialogDate(format(parseISO(entry.started_at || entry.start_time), 'yyyy-MM-dd'));
    setDialogBillable(entry.billable);

    const loadSegments = async () => {
      setLoadingSegments(true);
      try {
        const { data, error } = await supabase
          .from('time_entry_segments')
          .select('start_time, end_time')
          .eq('time_entry_id', entry.id)
          .order('start_time', { ascending: true });
        if (error) throw error;

        if (data && data.length > 0) {
          setDialogTimeMode('start_end');
          setDialogStartEndRanges(
            data.map((seg) => ({
              start: format(parseISO(seg.start_time), 'HH:mm'),
              end: format(parseISO(seg.end_time), 'HH:mm'),
            })),
          );
          setDialogHours('');
          return;
        }

        if (entry.end_time) {
          setDialogTimeMode('start_end');
          setDialogStartEndRanges([
            {
              start: format(parseISO(entry.start_time), 'HH:mm'),
              end: format(parseISO(entry.end_time), 'HH:mm'),
            },
          ]);
          setDialogHours('');
        } else {
          setDialogTimeMode('manual');
          setDialogStartEndRanges([{ start: '09:00', end: '17:00' }]);
          const totalSec =
            entry.total_duration_seconds ?? (entry.duration_minutes != null ? entry.duration_minutes * 60 : 0);
          setDialogHours(totalSec > 0 ? (totalSec / 3600).toFixed(2) : '');
        }
      } catch (error) {
        console.error('Error loading time entry segments:', error);
        const totalSec =
          entry.total_duration_seconds ?? (entry.duration_minutes != null ? entry.duration_minutes * 60 : 0);
        setDialogTimeMode('manual');
        setDialogHours(totalSec > 0 ? (totalSec / 3600).toFixed(2) : '');
      } finally {
        setLoadingSegments(false);
      }
    };

    void loadSegments();
  }, [open, entry, defaultProjectId, defaultTaskId, defaultDate, defaultHours]);

  const createTaskInline = async (title: string, projectId: string) => {
    if (!user || !projectId) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const existing = tasks.find((t) => t.project_id === projectId && t.title.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setDialogTask(existing.id);
      return;
    }
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: trimmed,
        project_id: projectId,
        user_id: user.id,
        status: 'todo',
        priority: null,
      })
      .select('id, title, project_id')
      .single();
    if (error || !data) {
      toast({ title: 'Error creating task', description: error?.message, variant: 'destructive' });
      return;
    }
    setTasks((prev) => [...prev, data].sort((a, b) => a.title.localeCompare(b.title)));
    setDialogTask(data.id);
  };

  const handleCreateTaskFromDialog = async () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed || !dialogProject) return;
    await createTaskInline(trimmed, dialogProject);
    setNewTaskTitle('');
    setCreateTaskDialogOpen(false);
  };

  const addDialogStartEndRange = () => {
    setDialogStartEndRanges((prev) => [...prev, { start: '09:00', end: '17:00' }]);
  };

  const removeDialogStartEndRange = (index: number) => {
    setDialogStartEndRanges((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updateDialogStartEndRange = (index: number, field: 'start' | 'end', value: string) => {
    setDialogStartEndRanges((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const getDialogRangesTotalSeconds = () =>
    dialogStartEndRanges.reduce((sum, r) => {
      const start = new Date(`${dialogDate}T${r.start}:00`);
      const end = new Date(`${dialogDate}T${r.end}:00`);
      if (end <= start) return sum;
      return sum + differenceInSeconds(end, start);
    }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (!dialogProject) {
      toast({ title: 'Project required', description: 'Please select a project', variant: 'destructive' });
      return;
    }

    let segmentsToSave: { startTime: Date; endTime: Date; durationSeconds: number }[] = [];

    if (dialogTimeMode === 'start_end') {
      for (let i = 0; i < dialogStartEndRanges.length; i++) {
        const r = dialogStartEndRanges[i];
        const st = new Date(`${dialogDate}T${r.start}:00`);
        const et = new Date(`${dialogDate}T${r.end}:00`);
        if (et <= st) {
          toast({
            title: 'Invalid times',
            description: `Range ${i + 1}: end time must be after start time`,
            variant: 'destructive',
          });
          return;
        }
        segmentsToSave.push({
          startTime: st,
          endTime: et,
          durationSeconds: differenceInSeconds(et, st),
        });
      }
      if (segmentsToSave.length === 0) {
        toast({ title: 'Add at least one time range', variant: 'destructive' });
        return;
      }
    } else {
      const hours = parseFloat(dialogHours);
      if (isNaN(hours) || hours <= 0) {
        toast({ title: 'Invalid hours', description: 'Please enter valid hours', variant: 'destructive' });
        return;
      }
      const durationSeconds = Math.max(0, Math.round(hours * 3600));
      if (durationSeconds <= 0) {
        toast({
          title: 'Invalid hours',
          description: 'Please enter at least 0.01 hours',
          variant: 'destructive',
        });
        return;
      }
      const startTime = new Date(`${dialogDate}T09:00:00`);
      const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
      segmentsToSave = [{ startTime, endTime, durationSeconds }];
    }

    const firstStart = segmentsToSave[0].startTime;
    const lastEnd = segmentsToSave[segmentsToSave.length - 1].endTime;

    try {
      const effectiveHourlyRate = await resolveEffectiveHourlyRate({
        userId: user.id,
        projectId: dialogProject || null,
      });

      if (entry) {
        await supabase
          .from('time_entries')
          .update({
            description: dialogDescription || null,
            project_id: dialogProject,
            task_id: dialogTask || null,
            billable: dialogBillable,
            billing_status: dialogBillable ? 'unbilled' : 'not_billable',
            hourly_rate: effectiveHourlyRate,
            start_time: firstStart.toISOString(),
            end_time: lastEnd.toISOString(),
            started_at: firstStart.toISOString(),
          })
          .eq('id', entry.id);
        await supabase.from('time_entry_segments').delete().eq('time_entry_id', entry.id);
        for (const seg of segmentsToSave) {
          await supabase.from('time_entry_segments').insert({
            time_entry_id: entry.id,
            start_time: seg.startTime.toISOString(),
            end_time: seg.endTime.toISOString(),
            duration_seconds: seg.durationSeconds,
          });
        }
        toast({ title: 'Time entry updated' });
      } else {
        const { data: entryRow, error: entryError } = await supabase
          .from('time_entries')
          .insert({
            description: dialogDescription || null,
            project_id: dialogProject,
            task_id: dialogTask || null,
            billable: dialogBillable,
            billing_status: dialogBillable ? 'unbilled' : 'not_billable',
            hourly_rate: effectiveHourlyRate,
            user_id: user.id,
            start_time: firstStart.toISOString(),
            end_time: lastEnd.toISOString(),
            started_at: firstStart.toISOString(),
          })
          .select('id')
          .single();
        if (entryError) throw entryError;
        if (!entryRow?.id) throw new Error('No id returned');
        for (const seg of segmentsToSave) {
          await supabase.from('time_entry_segments').insert({
            time_entry_id: entryRow.id,
            start_time: seg.startTime.toISOString(),
            end_time: seg.endTime.toISOString(),
            duration_seconds: seg.durationSeconds,
          });
        }
        toast({ title: 'Time entry added' });
        notifyStartGuideRefresh();
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error: unknown) {
      toast({
        title: 'Error saving entry',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!entry?.id) return;
    const ok = await confirm({
      title: 'Delete time entry?',
      description: 'Delete this time entry?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('time_entries').delete().eq('id', entry.id);
      if (error) throw error;
      toast({ title: 'Time entry deleted' });
      onOpenChange(false);
      onSaved?.();
    } catch (error: unknown) {
      toast({
        title: 'Error deleting entry',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[min(90vh,720px)] !flex flex-col gap-0 p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0 pr-12">
          <DialogTitle>{isEditing ? 'Edit Time Entry' : 'Manual Log'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this time entry' : 'Add time for a project task'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6" style={{ maxHeight: 'min(60vh, 520px)' }}>
          <form id="time-entry-log-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Popover open={dialogProjectPopoverOpen} onOpenChange={setDialogProjectPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full min-w-0 justify-start overflow-hidden"
                    disabled={(lockProject && !isEditing) || isBusy}
                  >
                    <span className="min-w-0 truncate text-left">
                      {selectedDialogProject?.name || 'Select project'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                  <Command>
                    <CommandInput
                      placeholder="Find project..."
                      value={dialogProjectQuery}
                      onValueChange={setDialogProjectQuery}
                    />
                    <CommandList>
                      {projects.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => {
                            setDialogProject(p.id);
                            setDialogTask('');
                            setDialogProjectPopoverOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', dialogProject === p.id ? 'opacity-100' : 'opacity-0')} />
                          {p.name}
                        </CommandItem>
                      ))}
                      {dialogProjectQuery.trim() &&
                        !projects.some((p) => p.name.toLowerCase() === dialogProjectQuery.trim().toLowerCase()) && (
                          <CommandItem
                            value={`create-${dialogProjectQuery}`}
                            onSelect={() => {
                              setDialogProjectQuery('');
                              setDialogProjectPopoverOpen(false);
                              setCreateProjectDialogOpen(true);
                            }}
                          >
                            + Create project
                          </CommandItem>
                        )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Task (optional)</Label>
              <Popover open={dialogTaskPopoverOpen} onOpenChange={setDialogTaskPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full min-w-0 justify-start overflow-hidden"
                    disabled={!dialogProject || isBusy}
                  >
                    <span className="min-w-0 truncate text-left">
                      {selectedDialogTask?.title || (dialogProject ? 'No task' : 'Select a project first')}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                  <Command>
                    <CommandInput placeholder="Find task..." value={dialogTaskQuery} onValueChange={setDialogTaskQuery} />
                    <CommandList>
                      <CommandItem value="none" onSelect={() => { setDialogTask(''); setDialogTaskPopoverOpen(false); }}>
                        <Check className={cn('mr-2 h-4 w-4', !dialogTask ? 'opacity-100' : 'opacity-0')} />
                        No task
                      </CommandItem>
                      {tasks.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.title}
                          onSelect={() => {
                            setDialogTask(t.id);
                            setDialogTaskPopoverOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', dialogTask === t.id ? 'opacity-100' : 'opacity-0')} />
                          {t.title}
                        </CommandItem>
                      ))}
                      {dialogTaskQuery.trim() &&
                        dialogProject &&
                        !tasks.some((t) => t.title.toLowerCase() === dialogTaskQuery.trim().toLowerCase()) && (
                          <CommandItem
                            value={`create-task-${dialogTaskQuery}`}
                            onSelect={async () => {
                              await createTaskInline(dialogTaskQuery, dialogProject);
                              setDialogTaskQuery('');
                              setDialogTaskPopoverOpen(false);
                            }}
                          >
                            + Create "{dialogTaskQuery.trim()}"
                          </CommandItem>
                        )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {dialogProject ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-0 text-xs text-muted-foreground"
                  disabled={isBusy}
                  onClick={() => {
                    setNewTaskTitle('');
                    setCreateTaskDialogOpen(true);
                  }}
                >
                  + Create task
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog_description">Notes</Label>
              <Textarea
                id="dialog_description"
                value={dialogDescription}
                onChange={(e) => setDialogDescription(e.target.value)}
                placeholder="Optional notes for this task"
                rows={3}
                disabled={isBusy}
              />
            </div>
            <div className="space-y-2">
              <Label>Time entry</Label>
              <div className="flex gap-4 p-2 rounded-lg border bg-muted/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="time_mode"
                    checked={dialogTimeMode === 'start_end'}
                    onChange={() => setDialogTimeMode('start_end')}
                    className="rounded-full border-primary text-primary"
                    disabled={isBusy}
                  />
                  <span className="text-sm">Start & end time</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="time_mode"
                    checked={dialogTimeMode === 'manual'}
                    onChange={() => setDialogTimeMode('manual')}
                    className="rounded-full border-primary text-primary"
                    disabled={isBusy}
                  />
                  <span className="text-sm">Enter hours</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog_date">Date *</Label>
              <Input
                id="dialog_date"
                type="date"
                value={dialogDate}
                onChange={(e) => setDialogDate(e.target.value)}
                required
                disabled={isBusy}
              />
            </div>
            {dialogTimeMode === 'start_end' ? (
              <div className="space-y-3">
                <Label>Time ranges</Label>
                {dialogStartEndRanges.map((range, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="time"
                        value={range.start}
                        onChange={(e) => updateDialogStartEndRange(i, 'start', e.target.value)}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label className="text-xs">End</Label>
                      <Input
                        type="time"
                        value={range.end}
                        onChange={(e) => updateDialogStartEndRange(i, 'end', e.target.value)}
                        disabled={isBusy}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDialogStartEndRange(i)}
                      disabled={dialogStartEndRanges.length <= 1 || isBusy}
                      title="Remove range"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addDialogStartEndRange} disabled={isBusy}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add another range
                </Button>
                {dialogStartEndRanges.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Total: {formatDuration(getDialogRangesTotalSeconds(), true)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="dialog_hours">Hours *</Label>
                <Input
                  id="dialog_hours"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={dialogHours}
                  onChange={(e) => setDialogHours(e.target.value)}
                  placeholder="e.g. 1.5 or 2.25"
                  required={dialogTimeMode === 'manual'}
                  disabled={isBusy}
                />
                <p className="text-xs text-muted-foreground">Enter any decimal (e.g. 0.25, 1.5, 2.75).</p>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="dialog_billable" className="cursor-pointer">
                Billable time
              </Label>
              <Switch
                id="dialog_billable"
                checked={dialogBillable}
                onCheckedChange={setDialogBillable}
                disabled={isBusy}
              />
            </div>
          </form>
        </div>
        <DialogFooter
          className={cn(
            'px-6 py-4 border-t shrink-0 bg-card gap-2',
            isEditing ? 'sm:justify-between' : 'sm:justify-end',
          )}
        >
          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => void handleDelete()}
              disabled={isBusy}
            >
              Delete
            </Button>
          ) : null}
          <div className="flex gap-2 sm:ml-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="submit" form="time-entry-log-form" disabled={isBusy}>
              {isEditing ? 'Update' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ProjectFormDialog
      open={createProjectDialogOpen}
      onOpenChange={setCreateProjectDialogOpen}
      clients={clients}
      onSaved={(project) => {
        setProjects((prev) =>
          [
            ...prev.filter((item) => item.id !== project.id),
            {
              id: project.id,
              name: project.name,
              client_id: project.client_id,
              hourly_rate: project.hourly_rate,
            },
          ].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setDialogProject(project.id);
        setDialogTask('');
      }}
      onClientSaved={(client) => {
        setClients((prev) =>
          [...prev.filter((item) => item.id !== client.id), client].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      }}
    />

    <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            {selectedDialogProject
              ? `Add a task to ${selectedDialogProject.name}`
              : 'Select a project first'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreateTaskFromDialog();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateTaskFromDialog()}
              disabled={!newTaskTitle.trim() || !dialogProject}
            >
              Create
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
    {ConfirmDialogHost}
    </>
  );
}