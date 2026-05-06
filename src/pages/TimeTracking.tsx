import { useEffect, useState, useRef } from 'react';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTimer, formatElapsed, TIMER_ENTRY_SAVED_EVENT } from '@/contexts/TimerContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { notifyStartGuideRefresh } from '@/components/layout/StartGuide';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Play, Square, Trash2, Filter, Download, Upload, List, Check } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { format, differenceInMinutes, differenceInSeconds, parseISO, startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/time';
import { resolveEffectiveHourlyRate } from '@/lib/billing';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  downloadCsv,
  parseCsv,
  getTimeEntriesTemplateRows,
  TIME_ENTRIES_CSV_HEADERS,
} from '@/lib/csv';

interface Project {
  id: string;
  name: string;
  client_id: string | null;
  hourly_rate?: number | null;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
}

interface Client {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  started_at: string | null;
  total_duration_seconds: number | null;
  duration_minutes: number | null;
  billable: boolean;
  hourly_rate: number | null;
  project_id: string | null;
  task_id: string | null;
  billing_status: string | null;
  projects: { name: string; client_id: string | null } | null;
  tasks: { title: string } | null;
}

interface TimeEntrySegment {
  id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong');

/** Draft timer segment: start and optional end (null = currently running). */
interface DraftSegment {
  startMs: number;
  endMs: number | null;
}

/** One start/end time range in the manual log dialog (HH:mm). */
interface DialogStartEndRange {
  start: string;
  end: string;
}

type TimeframeFilter = 'all' | 'today' | 'week' | 'month' | 'last30';
type StatusFilter = 'all' | 'unbilled' | 'billed' | 'paid' | 'not_billable';

export default function TimeTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const {
    activeEntryId,
    draftSegments,
    timerDescription,
    setTimerDescription,
    timerProject,
    setTimerProject,
    timerTask,
    setTimerTask,
    timerBillable,
    setTimerBillable,
    startTimer,
    stopTimer,
    logTimeFromTimer,
    discardTimerSegment,
    getDraftTotalSeconds,
    isLocalTimerRunning,
    resumeEntry,
  } = useTimer();
  const [searchParams] = useSearchParams();
  const prefilledProjectId = searchParams.get('project') || '';
  const lockPrefilledProject = Boolean(prefilledProjectId);
  const [projectQuery, setProjectQuery] = useState('');
  const [taskQuery, setTaskQuery] = useState('');
  const [dialogProjectQuery, setDialogProjectQuery] = useState('');
  const [dialogTaskQuery, setDialogTaskQuery] = useState('');
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);
  const [dialogProjectPopoverOpen, setDialogProjectPopoverOpen] = useState(false);
  const [dialogTaskPopoverOpen, setDialogTaskPopoverOpen] = useState(false);

  // Filters
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // Dialog state
  const [dialogProject, setDialogProject] = useState<string>('');
  const [dialogTask, setDialogTask] = useState<string>('');
  const [dialogTimeMode, setDialogTimeMode] = useState<'start_end' | 'manual'>('manual');
  const [dialogStartTime, setDialogStartTime] = useState<string>('09:00');
  const [dialogEndTime, setDialogEndTime] = useState<string>('17:00');
  /** Multiple start/end ranges when mode is start_end (same mechanic as timer segments). */
  const [dialogStartEndRanges, setDialogStartEndRanges] = useState<DialogStartEndRange[]>([{ start: '09:00', end: '17:00' }]);
  const [dialogHours, setDialogHours] = useState<string>('');
  const [dialogDescription, setDialogDescription] = useState<string>('');
  const [dialogDate, setDialogDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dialogBillable, setDialogBillable] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLogEntry, setSelectedLogEntry] = useState<TimeEntry | null>(null);
  const [selectedLogSegments, setSelectedLogSegments] = useState<TimeEntrySegment[]>([]);
  const [loadingSelectedLogSegments, setLoadingSelectedLogSegments] = useState(false);
  const location = useLocation();
  const isTimerView = location.pathname === '/time/timer';

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchProjects();
      fetchClients();
    }
  }, [user]);

  useEffect(() => {
    if (dialogProject) {
      fetchTasksForProject(dialogProject);
    } else {
      setTasks([]);
    }
  }, [dialogProject]);

  useEffect(() => {
    if (timerProject) {
      fetchTasksForProject(timerProject);
    }
  }, [timerProject]);

  useEffect(() => {
    if (prefilledProjectId && isDialogOpen && !editingEntry) {
      setDialogProject(prefilledProjectId);
    }
  }, [prefilledProjectId, isDialogOpen, editingEntry]);

  useEffect(() => {
    const onSaved = () => fetchEntries();
    window.addEventListener(TIMER_ENTRY_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(TIMER_ENTRY_SAVED_EVENT, onSaved);
  }, [user]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          projects(name, client_id),
          tasks(title)
        `)
        .order('started_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id, hourly_rate')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchTasksForProject = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, project_id')
        .eq('project_id', projectId)
        .order('title');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const selectedTimerProject = projects.find((p) => p.id === timerProject);
  const selectedTimerTask = tasks.find((t) => t.id === timerTask);
  const selectedDialogProject = projects.find((p) => p.id === dialogProject);
  const selectedDialogTask = tasks.find((t) => t.id === dialogTask);

  const createProjectInline = async (name: string, forDialog: boolean) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = projects.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (forDialog) setDialogProject(existing.id);
      else setTimerProject(existing.id);
      return;
    }
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: trimmed, user_id: user.id, status: 'active' })
      .select('id, name, client_id')
      .single();
    if (error || !data) {
      toast({ title: 'Error creating project', description: error?.message, variant: 'destructive' });
      return;
    }
    setProjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    if (forDialog) {
      setDialogProject(data.id);
      setDialogTask('');
    } else {
      setTimerProject(data.id);
      setTimerTask('');
    }
  };

  const createTaskInline = async (title: string, projectId: string, forDialog: boolean) => {
    if (!user || !projectId) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const existing = tasks.find((t) => t.project_id === projectId && t.title.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (forDialog) setDialogTask(existing.id);
      else setTimerTask(existing.id);
      return;
    }
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: trimmed,
        project_id: projectId,
        user_id: user.id,
        status: 'todo',
        priority: 'medium',
      })
      .select('id, title, project_id')
      .single();
    if (error || !data) {
      toast({ title: 'Error creating task', description: error?.message, variant: 'destructive' });
      return;
    }
    setTasks((prev) => [...prev, data].sort((a, b) => a.title.localeCompare(b.title)));
    if (forDialog) setDialogTask(data.id);
    else setTimerTask(data.id);
  };

  const openLogDialog = (entry?: TimeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setDialogProject(entry.project_id || '');
      setDialogTask(entry.task_id || '');
      setDialogDescription(entry.description || '');
      const entryDate = entry.started_at || entry.start_time;
      setDialogDate(format(parseISO(entryDate), 'yyyy-MM-dd'));
      setDialogBillable(entry.billable);
      if (entry.end_time) {
        setDialogTimeMode('start_end');
        setDialogStartTime(format(parseISO(entry.start_time), 'HH:mm'));
        setDialogEndTime(format(parseISO(entry.end_time), 'HH:mm'));
        setDialogStartEndRanges([{ start: format(parseISO(entry.start_time), 'HH:mm'), end: format(parseISO(entry.end_time), 'HH:mm') }]);
        setDialogHours('');
      } else {
        setDialogTimeMode('manual');
        setDialogStartTime('09:00');
        setDialogEndTime('17:00');
        setDialogStartEndRanges([{ start: '09:00', end: '17:00' }]);
        const totalSec = entry.total_duration_seconds ?? (entry.duration_minutes != null ? entry.duration_minutes * 60 : 0);
        setDialogHours(totalSec > 0 ? (totalSec / 3600).toFixed(2) : '');
      }
    } else {
      setEditingEntry(null);
      setDialogProject(prefilledProjectId || '');
      setDialogTask('');
      setDialogTimeMode('manual');
      setDialogStartTime('09:00');
      setDialogEndTime('17:00');
      setDialogStartEndRanges([{ start: '09:00', end: '17:00' }]);
      setDialogHours('');
      setDialogDescription('');
      setDialogDate(format(new Date(), 'yyyy-MM-dd'));
      setDialogBillable(true);
    }
    setIsDialogOpen(true);
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

  const handleLogEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!dialogProject) {
      toast({
        title: 'Project required',
        description: 'Please select a project',
        variant: 'destructive',
      });
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
        toast({
          title: 'Invalid hours',
          description: 'Please enter valid hours',
          variant: 'destructive',
        });
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
      const startTime = new Date(`${dialogDate}T${dialogStartTime}:00`);
      const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
      segmentsToSave = [{ startTime, endTime, durationSeconds }];
    }

    const totalDurationSeconds = segmentsToSave.reduce((s, seg) => s + seg.durationSeconds, 0);
    const firstStart = segmentsToSave[0].startTime;

    try {
      const effectiveHourlyRate = await resolveEffectiveHourlyRate({
        userId: user!.id,
        projectId: dialogProject || null,
      });
      if (editingEntry) {
        await supabase
          .from('time_entries')
          .update({
            description: dialogDescription || null,
            project_id: dialogProject,
            task_id: dialogTask || null,
            billable: dialogBillable,
            billing_status: dialogBillable ? 'unbilled' : 'not_billable',
            hourly_rate: effectiveHourlyRate,
          })
          .eq('id', editingEntry.id);
        await supabase.from('time_entry_segments').delete().eq('time_entry_id', editingEntry.id);
        for (const seg of segmentsToSave) {
          await supabase.from('time_entry_segments').insert({
            time_entry_id: editingEntry.id,
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
            user_id: user!.id,
            start_time: firstStart.toISOString(),
            end_time: firstStart.toISOString(),
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
      
      setIsDialogOpen(false);
      setEditingEntry(null);
      fetchEntries();
    } catch (error: unknown) {
      toast({
        title: 'Error saving entry',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this time entry?')) return;
    
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSelectedEntryIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: 'Entry deleted' });
      fetchEntries();
    } catch (error: unknown) {
      toast({
        title: 'Error deleting entry',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const toggleEntrySelection = (id: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusBadge = (entry: TimeEntry) => {
    if (!entry.billable) {
      return <Badge variant="secondary">Not Billable</Badge>;
    }
    switch (entry.billing_status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success">Paid</Badge>;
      case 'billed':
        return <Badge className="bg-primary/10 text-primary">Billed</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning">Billable</Badge>;
    }
  };

  // Apply filters
  const filteredEntries = entries.filter(entry => {
    // Timeframe filter
    if (timeframeFilter !== 'all') {
      const entryDate = parseISO(entry.started_at || entry.start_time);
      const now = new Date();
      
      switch (timeframeFilter) {
        case 'today':
          if (format(entryDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) return false;
          break;
        case 'week':
          if (entryDate < startOfWeek(now) || entryDate > endOfWeek(now)) return false;
          break;
        case 'month':
          if (entryDate < startOfMonth(now) || entryDate > endOfMonth(now)) return false;
          break;
        case 'last30':
          if (entryDate < subDays(now, 30)) return false;
          break;
      }
    }

    // Project filter
    if (projectFilter !== 'all' && entry.project_id !== projectFilter) return false;

    // Client filter
    if (clientFilter !== 'all' && entry.projects?.client_id !== clientFilter) return false;

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'not_billable' && entry.billable) return false;
      if (statusFilter === 'unbilled' && (entry.billing_status !== 'unbilled' || !entry.billable)) return false;
      if (statusFilter === 'billed' && entry.billing_status !== 'billed') return false;
      if (statusFilter === 'paid' && entry.billing_status !== 'paid') return false;
    }

    return true;
  });

  const selectAllFiltered = () => {
    setSelectedEntryIds(new Set(filteredEntries.map((e) => e.id)));
  };
  const clearSelection = () => setSelectedEntryIds(new Set());
  const allFilteredSelected = filteredEntries.length > 0 && filteredEntries.every((e) => selectedEntryIds.has(e.id));
  const someSelected = selectedEntryIds.size > 0;

  const handleDeleteSelected = async () => {
    if (selectedEntryIds.size === 0) return;
    if (!confirm(`Delete ${selectedEntryIds.size} selected entr${selectedEntryIds.size === 1 ? 'y' : 'ies'}?`)) return;
    try {
      const ids = Array.from(selectedEntryIds);
      for (const id of ids) {
        const { error } = await supabase.from('time_entries').delete().eq('id', id);
        if (error) throw error;
      }
      setSelectedEntryIds(new Set());
      toast({ title: `${ids.length} entr${ids.length === 1 ? 'y' : 'ies'} deleted` });
      fetchEntries();
    } catch (error: unknown) {
      toast({ title: 'Error deleting entries', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const openLogDetails = async (entry: TimeEntry) => {
    setSelectedLogEntry(entry);
    setLoadingSelectedLogSegments(true);
    try {
      const { data, error } = await supabase
        .from('time_entry_segments')
        .select('id, start_time, end_time, duration_seconds')
        .eq('time_entry_id', entry.id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      setSelectedLogSegments((data || []) as TimeEntrySegment[]);
    } catch (error) {
      console.error('Error fetching entry segments:', error);
      setSelectedLogSegments([]);
    } finally {
      setLoadingSelectedLogSegments(false);
    }
  };

  const handleDeleteAllFiltered = async () => {
    if (filteredEntries.length === 0) return;
    if (!confirm(`Delete all ${filteredEntries.length} entr${filteredEntries.length === 1 ? 'y' : 'ies'} in this view? This cannot be undone.`)) return;
    try {
      const ids = filteredEntries.map((e) => e.id);
      for (const id of ids) {
        const { error } = await supabase.from('time_entries').delete().eq('id', id);
        if (error) throw error;
      }
      setSelectedEntryIds(new Set());
      toast({ title: `${ids.length} entr${ids.length === 1 ? 'y' : 'ies'} deleted` });
      fetchEntries();
    } catch (error: unknown) {
      toast({ title: 'Error deleting entries', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  /** Total duration in seconds for display and totals. Prefer total_duration_seconds (includes seconds). */
  const getEntrySeconds = (e: TimeEntry) => {
    if (e.total_duration_seconds != null && e.total_duration_seconds > 0) return e.total_duration_seconds;
    if (e.duration_minutes != null) return e.duration_minutes * 60;
    if (e.start_time && e.end_time) return Math.max(0, differenceInMinutes(parseISO(e.end_time), parseISO(e.start_time))) * 60;
    return 0;
  };
  const totalHours = filteredEntries.reduce((sum, e) => sum + getEntrySeconds(e), 0) / 3600;
  const billableHours = filteredEntries.filter(e => e.billable).reduce((sum, e) => sum + getEntrySeconds(e), 0) / 3600;

  const handleDownloadTimeTemplate = () => {
    downloadCsv('time_entries_template.csv', getTimeEntriesTemplateRows());
    toast({ title: 'Template downloaded' });
  };

  const handleExportTimeCsv = () => {
    const rows = [
      TIME_ENTRIES_CSV_HEADERS,
      ...filteredEntries.map((e) => [
        e.start_time,
        e.end_time ?? '',
        String(e.duration_minutes ?? ''),
        e.description ?? '',
        e.billable ? 'true' : 'false',
        String(e.hourly_rate ?? ''),
        e.projects?.name ?? '',
        e.tasks?.title ?? '',
      ]),
    ];
    downloadCsv(`time_entries_export_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: `Exported ${filteredEntries.length} time entries` });
  };

  const handleImportTimeCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);
    try {
      const rows = await parseCsv(file);
      if (rows.length < 2) {
        toast({ title: 'No data rows in file', variant: 'destructive' });
        return;
      }
      const header = rows[0].map((h) => h.toLowerCase().replace(/\s/g, '_'));
      const dataRows = rows.slice(1);
      const startIdx = header.indexOf('start_time');
      const endIdx = header.indexOf('end_time');
      const durationIdx = header.indexOf('duration_minutes');
      const descIdx = header.indexOf('description');
      const billableIdx = header.indexOf('billable');
      const rateIdx = header.indexOf('hourly_rate');
      const projectIdx = header.indexOf('project_name');
      const taskIdx = header.indexOf('task_title');
      if (startIdx === -1) {
        toast({ title: 'CSV must have start_time column', variant: 'destructive' });
        return;
      }
      let created = 0;
      for (const row of dataRows) {
        const startTime = row[startIdx]?.trim();
        if (!startTime) continue;
        let projectId: string | null = null;
        const projectName = projectIdx >= 0 ? row[projectIdx]?.trim() : '';
        if (projectName) {
          const proj = projects.find((p) => p.name === projectName);
          projectId = proj?.id ?? null;
        }
        let taskId: string | null = null;
        const taskTitle = taskIdx >= 0 ? row[taskIdx]?.trim() : '';
        if (taskTitle && projectId) {
          const { data: taskData } = await supabase.from('tasks').select('id').eq('project_id', projectId).eq('title', taskTitle).maybeSingle();
          taskId = taskData?.id ?? null;
        }
        const endTime = endIdx >= 0 ? row[endIdx]?.trim() || null : null;
        const duration = durationIdx >= 0 ? (parseInt(row[durationIdx], 10) || null) : null;
        const description = descIdx >= 0 ? row[descIdx]?.trim() || null : null;
        const billable = billableIdx >= 0 ? row[billableIdx]?.toLowerCase() !== 'false' && row[billableIdx] !== '0' : true;
        const hourlyRate = rateIdx >= 0 ? (parseFloat(row[rateIdx]) || null) : null;
        const durationMins = duration != null ? duration : (endTime ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) : 0);
        const totalSec = durationMins * 60;
        const { error } = await supabase.from('time_entries').insert({
          start_time: startTime,
          end_time: endTime || startTime,
          duration_minutes: durationMins,
          total_duration_seconds: totalSec,
          started_at: startTime,
          description,
          billable,
          hourly_rate: hourlyRate,
          project_id: projectId,
          task_id: taskId,
          billing_status: billable ? 'unbilled' : 'not_billable',
          user_id: user.id,
        });
        if (!error) created++;
      }
      setImportDialogOpen(false);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
      toast({ title: `Imported ${created} time entries` });
      if (created > 0) notifyStartGuideRefresh();
      fetchEntries();
    } catch (err: unknown) {
      toast({ title: 'Import failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{isTimerView ? 'Timer' : 'Time logs'}</h1>
            <p className="text-muted-foreground">
              {isTimerView
                ? 'Track time and save entries. Your timer keeps running when you switch pages—use the bar at the bottom to pause or save.'
                : 'Log and manage your billable hours'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* In-page tabs: Timer | Logs (for mobile and quick switch) */}
            <div className="flex rounded-lg border bg-muted/50 p-0.5 mr-2">
              <Link
                to="/time/timer"
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isTimerView ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Timer
              </Link>
              <Link
                to="/time/logs"
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  !isTimerView ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Logs
              </Link>
            </div>
            {!isTimerView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="Template, export, or import CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadTimeTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportTimeCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)} disabled={importing}>
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing…' : 'Import'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openLogDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Manual Log
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEntry ? 'Edit Time Entry' : 'Manual Log'}</DialogTitle>
                <DialogDescription>
                  {editingEntry ? 'Update this time entry' : 'Add time for a project task'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLogEntry} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dialog_project">Project *</Label>
                  <Popover open={dialogProjectPopoverOpen} onOpenChange={setDialogProjectPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" disabled={lockPrefilledProject && !editingEntry}>
                        {selectedDialogProject?.name || 'Select project'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                      <Command>
                        <CommandInput placeholder="Find project..." value={dialogProjectQuery} onValueChange={setDialogProjectQuery} />
                        <CommandList>
                          {projects.map((p) => (
                            <CommandItem key={p.id} value={p.name} onSelect={() => { setDialogProject(p.id); setDialogTask(''); setDialogProjectPopoverOpen(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', dialogProject === p.id ? 'opacity-100' : 'opacity-0')} />
                              {p.name}
                            </CommandItem>
                          ))}
                          {dialogProjectQuery.trim() && !projects.some((p) => p.name.toLowerCase() === dialogProjectQuery.trim().toLowerCase()) && (
                            <CommandItem
                              value={`create-${dialogProjectQuery}`}
                              onSelect={async () => {
                                await createProjectInline(dialogProjectQuery, true);
                                setDialogProjectQuery('');
                                setDialogProjectPopoverOpen(false);
                              }}
                            >
                              + Create "{dialogProjectQuery.trim()}"
                            </CommandItem>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dialog_task">Task (optional)</Label>
                  <Popover open={dialogTaskPopoverOpen} onOpenChange={setDialogTaskPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" disabled={!dialogProject}>
                        {selectedDialogTask?.title || (dialogProject ? 'No task' : 'Select a project first')}
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
                            <CommandItem key={t.id} value={t.title} onSelect={() => { setDialogTask(t.id); setDialogTaskPopoverOpen(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', dialogTask === t.id ? 'opacity-100' : 'opacity-0')} />
                              {t.title}
                            </CommandItem>
                          ))}
                          {dialogTaskQuery.trim() && dialogProject && !tasks.some((t) => t.title.toLowerCase() === dialogTaskQuery.trim().toLowerCase()) && (
                            <CommandItem
                              value={`create-task-${dialogTaskQuery}`}
                              onSelect={async () => {
                                await createTaskInline(dialogTaskQuery, dialogProject, true);
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dialog_description">Description</Label>
                  <Textarea
                    id="dialog_description"
                    value={dialogDescription}
                    onChange={(e) => setDialogDescription(e.target.value)}
                    placeholder="What did you work on?"
                    rows={3}
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
                          />
                        </div>
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <Label className="text-xs">End</Label>
                          <Input
                            type="time"
                            value={range.end}
                            onChange={(e) => updateDialogStartEndRange(i, 'end', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDialogStartEndRange(i)}
                          disabled={dialogStartEndRanges.length <= 1}
                          title="Remove range"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addDialogStartEndRange}>
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
                    />
                    <p className="text-xs text-muted-foreground">Enter any decimal (e.g. 0.25, 1.5, 2.75). No rounding.</p>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="dialog_billable" className="cursor-pointer">Billable time</Label>
                  <Switch
                    id="dialog_billable"
                    checked={dialogBillable}
                    onCheckedChange={setDialogBillable}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingEntry ? 'Update' : 'Save'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import time entries from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV with columns: start_time, end_time, duration_minutes, description, billable, hourly_rate, project_name, task_title. Use the template for the correct format.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input ref={importFileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportTimeCsv} />
              <Button variant="outline" className="w-full" disabled={importing} onClick={() => importFileInputRef.current?.click()}>
                {importing ? 'Importing…' : 'Choose CSV file'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isTimerView ? (
          /* Timer view: centered, spacious layout */
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Context: description & project above timer */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</Label>
                <Input
                  placeholder="What are you working on?"
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  className="text-base border-0 bg-muted/50 focus-visible:ring-2"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</Label>
                  <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-0 bg-muted/50">
                        {selectedTimerProject?.name || 'No project'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                      <Command>
                        <CommandInput placeholder="Find project..." value={projectQuery} onValueChange={setProjectQuery} />
                        <CommandList>
                          <CommandItem value="none" onSelect={() => { setTimerProject(''); setTimerTask(''); setProjectPopoverOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', !timerProject ? 'opacity-100' : 'opacity-0')} />
                            No project
                          </CommandItem>
                          {projects.map((p) => (
                            <CommandItem key={p.id} value={p.name} onSelect={() => { setTimerProject(p.id); setTimerTask(''); setProjectPopoverOpen(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', timerProject === p.id ? 'opacity-100' : 'opacity-0')} />
                              {p.name}
                            </CommandItem>
                          ))}
                          {projectQuery.trim() && !projects.some((p) => p.name.toLowerCase() === projectQuery.trim().toLowerCase()) && (
                            <CommandItem
                              value={`create-${projectQuery}`}
                              onSelect={async () => {
                                await createProjectInline(projectQuery, false);
                                setProjectQuery('');
                                setProjectPopoverOpen(false);
                              }}
                            >
                              + Create "{projectQuery.trim()}"
                            </CommandItem>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={async () => {
                      const name = window.prompt('New project name');
                      if (!name) return;
                      await createProjectInline(name, false);
                    }}
                  >
                    + Create project
                  </Button>
                </div>
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task</Label>
                  <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-0 bg-muted/50" disabled={!timerProject}>
                        {selectedTimerTask?.title || (timerProject ? 'No task' : 'Select project first')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                      <Command>
                        <CommandInput placeholder="Find task..." value={taskQuery} onValueChange={setTaskQuery} />
                        <CommandList>
                          <CommandItem value="none" onSelect={() => { setTimerTask(''); setTaskPopoverOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', !timerTask ? 'opacity-100' : 'opacity-0')} />
                            No task
                          </CommandItem>
                          {tasks.map((t) => (
                            <CommandItem key={t.id} value={t.title} onSelect={() => { setTimerTask(t.id); setTaskPopoverOpen(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', timerTask === t.id ? 'opacity-100' : 'opacity-0')} />
                              {t.title}
                            </CommandItem>
                          ))}
                          {taskQuery.trim() && timerProject && !tasks.some((t) => t.title.toLowerCase() === taskQuery.trim().toLowerCase()) && (
                            <CommandItem
                              value={`create-task-${taskQuery}`}
                              onSelect={async () => {
                                await createTaskInline(taskQuery, timerProject, false);
                                setTaskQuery('');
                                setTaskPopoverOpen(false);
                              }}
                            >
                              + Create "{taskQuery.trim()}"
                            </CommandItem>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    disabled={!timerProject}
                    onClick={async () => {
                      const title = window.prompt('New task title');
                      if (!title || !timerProject) return;
                      await createTaskInline(title, timerProject, false);
                    }}
                  >
                    + Create task
                  </Button>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch id="timer-billable" checked={timerBillable} onCheckedChange={setTimerBillable} />
                  <Label htmlFor="timer-billable" className="text-sm text-muted-foreground">Billable</Label>
                </div>
              </div>
            </div>

            {/* Big timer display */}
            <div className="rounded-2xl border-2 border-border bg-card p-10 flex flex-col items-center justify-center min-h-[240px]">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {draftSegments.length > 0 && isLocalTimerRunning ? 'Running' : draftSegments.length > 0 ? 'Paused' : 'Ready'}
              </p>
              <div className="text-5xl sm:text-6xl font-mono font-bold text-foreground tabular-nums">
                {draftSegments.length > 0 ? formatElapsed(getDraftTotalSeconds()) : '0:00'}
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-8">
                {isLocalTimerRunning ? (
                  <Button size="lg" variant="destructive" onClick={stopTimer} className="rounded-full px-8">
                    <Square className="mr-2 h-5 w-5" />
                    Pause
                  </Button>
                ) : (
                  <Button size="lg" onClick={startTimer} className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Play className="mr-2 h-5 w-5" />
                    {draftSegments.length > 0 ? 'Resume' : 'Start'}
                  </Button>
                )}
                {draftSegments.length > 0 && (
                  <>
                    <Button size="lg" variant="outline" onClick={discardTimerSegment} className="rounded-full">
                      Discard
                    </Button>
                    <Button size="lg" onClick={logTimeFromTimer} className="rounded-full">
                      Save entry
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Draft segments list */}
            {draftSegments.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Segments
                  </CardTitle>
                  <CardDescription>
                    Paused and resumed chunks. Save entry to log them as one time entry. You can also save from the bar at the bottom when you're on another page.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {draftSegments.map((seg, i) => {
                      const endMs = seg.endMs ?? Date.now();
                      const secs = Math.max(0, Math.round((endMs - seg.startMs) / 1000));
                      const isRunning = seg.endMs == null;
                      return (
                        <li
                          key={i}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm"
                        >
                          <span className="font-medium">
                            {i + 1}. {isRunning ? 'Current' : formatElapsed(secs)}
                          </span>
                          <span className={isRunning ? 'text-primary font-mono' : 'text-muted-foreground font-mono'}>
                            {formatElapsed(secs)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <SlotIcon slot="stat_hours" className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{formatDuration(Math.round(totalHours * 3600), true)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <SlotIcon slot="stat_money" className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billable Hours</p>
                  <p className="text-2xl font-bold">{formatDuration(Math.round(billableHours * 3600), true)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <SlotIcon slot="task_calendar" className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entries</p>
                  <p className="text-2xl font-bold">{filteredEntries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeframeFilter} onValueChange={(v) => setTimeframeFilter(v as TimeframeFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unbilled">Unbilled</SelectItem>
              <SelectItem value="billed">Billed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="not_billable">Not Billable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time Entries Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Time Entries</CardTitle>
            {filteredEntries.length > 0 && (
              selectionMode ? (
                <Button variant="ghost" size="sm" onClick={() => { setSelectionMode(false); clearSelection(); }}>
                  Done
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                  Select
                </Button>
              )
            )}
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No time entries found</p>
                <p className="text-sm">Start the timer or log time manually</p>
              </div>
            ) : (
              <>
                {selectionMode && (
                  <div className="flex flex-wrap items-center gap-3 mb-4 py-2 border-b">
                    <Button variant="ghost" size="sm" onClick={selectAllFiltered}>
                      Select all
                    </Button>
                    {someSelected && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedEntryIds.size} selected
                        </span>
                        <Button variant="ghost" size="sm" onClick={clearSelection}>
                          Clear
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeleteSelected} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete selected
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeleteAllFiltered} className="text-destructive hover:text-destructive">
                          Delete all ({filteredEntries.length})
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <Table>
                <TableHeader>
                  <TableRow>
                    {selectionMode && <TableHead className="w-10"></TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="cursor-pointer" onClick={() => openLogDetails(entry)}>
                      {selectionMode && (
                        <TableCell className="w-10">
                          <Checkbox
                            checked={selectedEntryIds.has(entry.id)}
                            onCheckedChange={() => toggleEntrySelection(entry.id)}
                            aria-label={`Select entry ${entry.id}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        {format(parseISO(entry.started_at || entry.start_time), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.projects?.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {entry.tasks?.title || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {entry.description || <span className="text-muted-foreground italic">No description</span>}
                      </TableCell>
                      <TableCell>
                        {getEntrySeconds(entry) > 0 ? formatDuration(getEntrySeconds(entry), true) : '—'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => resumeEntry(entry.id)}
                          >
                            Resume
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary-foreground"
                            onClick={() => openLogDialog(entry)}
                          >
                            <SlotIcon slot="action_edit" className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
          </CardContent>
        </Card>
        <Dialog open={!!selectedLogEntry} onOpenChange={(open) => !open && setSelectedLogEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Time Entry Details</DialogTitle>
              <DialogDescription>
                {selectedLogEntry?.projects?.name || 'No project'}{selectedLogEntry?.tasks?.title ? ` • ${selectedLogEntry.tasks.title}` : ''}
              </DialogDescription>
            </DialogHeader>
            {selectedLogEntry && (
              <div className="space-y-3 text-sm">
                <p><span className="text-muted-foreground">Description:</span> {selectedLogEntry.description || '—'}</p>
                <p><span className="text-muted-foreground">Total:</span> {formatDuration(getEntrySeconds(selectedLogEntry), true)}</p>
                <div className="space-y-2">
                  <p className="font-medium">Breakdown</p>
                  {loadingSelectedLogSegments ? (
                    <p className="text-muted-foreground">Loading…</p>
                  ) : selectedLogSegments.length === 0 ? (
                    <p className="text-muted-foreground">No segment breakdown found.</p>
                  ) : (
                    selectedLogSegments.map((segment, index) => (
                      <div key={segment.id} className="flex items-center justify-between rounded border p-2">
                        <span>{index + 1}. {format(parseISO(segment.start_time), 'MMM d, yyyy HH:mm:ss')} - {format(parseISO(segment.end_time), 'MMM d, yyyy HH:mm:ss')}</span>
                        <span className="font-mono">{formatDuration(segment.duration_seconds, true)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
