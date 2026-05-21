import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTimer, formatElapsed, TIMER_ENTRY_SAVED_EVENT } from '@/contexts/TimerContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { notifyStartGuideRefresh } from '@/components/layout/startGuideUtils';
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
import { Plus, Play, Trash2, Filter, Download, Upload, List, Check } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import {
  format,
  differenceInMinutes,
  differenceInSeconds,
  parseISO,
  startOfWeek,
  endOfWeek,
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  getDay,
} from 'date-fns';
import { Pause } from 'lucide-react';
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
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { formatLocaleDate } from '@/lib/datetime';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  downloadCsv,
  parseCsv,
  getTimeEntriesTemplateRows,
  TIME_ENTRIES_CSV_HEADERS,
} from '@/lib/csv';
import {
  applyTimeEntryFilters,
  getDateRangeForPreset,
  type DateRangePreset,
  type StatusFilter,
} from '@/lib/timeEntryFilters';
import { TimeEntryLogDialog } from '@/components/time/TimeEntryLogDialog';
import { TimeEntriesTable } from '@/components/time/TimeEntriesTable';

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
  archived_at: string | null;
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
  invoice_id?: string | null;
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
  const [logDialogDefaults, setLogDialogDefaults] = useState<{
    projectId?: string;
    taskId?: string;
    date?: string;
    hours?: string;
  }>({});
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
  const [searchParams, setSearchParams] = useSearchParams();
  const prefilledProjectId = searchParams.get('project') || '';
  const prefilledTaskId = searchParams.get('task') || '';
  const prefilledClientId = searchParams.get('client') || '';
  const prefilledStatus = searchParams.get('status') || '';
  const HISTORY_DATE_PRESETS: { id: DateRangePreset; label: string }[] = [
    { id: 'all', label: 'All time' },
    { id: 'this_week', label: 'This week' },
    { id: 'this_month', label: 'This month' },
    { id: 'last_6_months', label: 'Last 6 months' },
    { id: 'ytd', label: 'Year to date' },
  ];
  const editEntryId = searchParams.get('edit') || '';
  const lockPrefilledProject = Boolean(prefilledProjectId);
  const [projectQuery, setProjectQuery] = useState('');
  const [taskQuery, setTaskQuery] = useState('');
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);

  // Filters (initialized from URL when present)
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(() => {
    const preset = searchParams.get('preset');
    if (
      preset === 'this_week' ||
      preset === 'this_month' ||
      preset === 'last_6_months' ||
      preset === 'ytd' ||
      preset === 'custom'
    ) {
      return preset;
    }
    const legacy = searchParams.get('timeframe');
    if (legacy === 'week') return 'this_week';
    if (legacy === 'month') return 'this_month';
    if (legacy === 'last30') return 'last_6_months';
    return 'all';
  });
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') || '');
  const [projectFilter, setProjectFilter] = useState<string>(() => searchParams.get('project') || 'all');
  const [clientFilter, setClientFilter] = useState<string>(() => searchParams.get('client') || 'all');
  const [taskFilter, setTaskFilter] = useState<string>(() => searchParams.get('task') || 'all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const v = searchParams.get('status');
    return v === 'unbilled' || v === 'billed' || v === 'paid' || v === 'not_billable' ? v : 'all';
  });
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLogEntry, setSelectedLogEntry] = useState<TimeEntry | null>(null);
  const [selectedLogSegments, setSelectedLogSegments] = useState<TimeEntrySegment[]>([]);
  const [loadingSelectedLogSegments, setLoadingSelectedLogSegments] = useState(false);
  const location = useLocation();
  const isTimesheetView = location.pathname === '/time';
  const isTimerView = location.pathname === '/time/timer';
  const isHistoryView = location.pathname === '/time/history';
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [timesheetView, setTimesheetView] = useState<'day' | 'week' | 'month'>(() => {
    const view = searchParams.get('view');
    return view === 'week' || view === 'month' ? view : 'day';
  });
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);

  const todayHighlightClass = 'border-primary bg-primary/10';
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { dateFormat } = useLocalePreferences();
  const handledEditEntryRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchProjects();
      fetchClients();
      fetchAllTasks();
    }
  }, [user]);

  const formatUserDate = (value: Date | string) => {
    return formatLocaleDate(value, dateFormat);
  };

  useEffect(() => {
    if (!isTimesheetView) return;
    const view = searchParams.get('view');
    const next: 'day' | 'week' | 'month' = view === 'week' || view === 'month' ? view : 'day';
    setTimesheetView(next);
  }, [searchParams, isTimesheetView]);

  useEffect(() => {
    if (timerProject) {
      fetchTasksForProject(timerProject);
    }
  }, [timerProject]);

  useEffect(() => {
    if (!isTimesheetView && !isHistoryView) return;
    const next = new URLSearchParams();
    const setOrDelete = (key: string, value: string) => {
      if (value && value !== 'all') next.set(key, value);
    };
    setOrDelete('client', clientFilter);
    setOrDelete('project', projectFilter);
    setOrDelete('task', taskFilter);
    setOrDelete('status', statusFilter);
    if (isHistoryView) {
      setOrDelete('preset', dateRangePreset);
      setOrDelete('from', dateFrom);
      setOrDelete('to', dateTo);
    }
    const view = searchParams.get('view');
    if (view) next.set('view', view);
    const edit = searchParams.get('edit');
    if (edit) next.set('edit', edit);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [clientFilter, projectFilter, taskFilter, statusFilter, dateRangePreset, dateFrom, dateTo, isTimesheetView, isHistoryView]);

  useEffect(() => {
    if (!isTimerView) return;
    if (prefilledProjectId) setTimerProject(prefilledProjectId);
    if (!prefilledProjectId && prefilledTaskId) {
      const taskMatch = allTasks.find((t) => t.id === prefilledTaskId);
      if (taskMatch?.project_id) setTimerProject(taskMatch.project_id);
    }
    if (prefilledTaskId) setTimerTask(prefilledTaskId);
  }, [isTimerView, prefilledProjectId, prefilledTaskId, allTasks, setTimerProject, setTimerTask]);

  useEffect(() => {
    if (!isTimesheetView || !editEntryId || loading) return;
    if (handledEditEntryRef.current === editEntryId) return;
    const target = entries.find((entry) => entry.id === editEntryId);
    if (!target) return;
    handledEditEntryRef.current = editEntryId;
    const targetDate = parseISO(target.started_at || target.start_time);
    setSelectedDay(targetDate);
    setWeekStart(startOfWeek(targetDate, { weekStartsOn: 1 }));
    if (timesheetView !== 'day') {
      setTimesheetView('day');
    }
    openLogDialog(target);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('edit');
    nextParams.set('view', 'day');
    setSearchParams(nextParams, { replace: true });
  }, [isTimesheetView, editEntryId, loading, entries, searchParams, setSearchParams, timesheetView]);

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
        .select('id, name, archived_at')
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

  const fetchAllTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, project_id')
        .order('title');
      if (error) throw error;
      setAllTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const selectedTimerProject = projects.find((p) => p.id === timerProject);
  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const archivedClientLabelForProject = (project: Project) => {
    if (!project.client_id) return null;
    const client = clientById.get(project.client_id);
    return client?.archived_at ? "Archived client" : null;
  };
  const selectedTimerTask = tasks.find((t) => t.id === timerTask);
  const createProjectInline = async (name: string) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = projects.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setTimerProject(existing.id);
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
    setTimerProject(data.id);
    setTimerTask('');
  };

  const createTaskInline = async (title: string, projectId: string) => {
    if (!user || !projectId) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const existing = tasks.find((t) => t.project_id === projectId && t.title.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setTimerTask(existing.id);
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
    setTimerTask(data.id);
  };

  const openLogDialog = (entry?: TimeEntry) => {
    setEditingEntry(entry ?? null);
    setLogDialogDefaults(
      entry
        ? {}
        : {
            projectId: prefilledProjectId || undefined,
            taskId: prefilledTaskId || undefined,
          },
    );
    setIsDialogOpen(true);
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

  const entriesMatchingFilters = useMemo(
    () =>
      applyTimeEntryFilters(entries, {
        projectFilter,
        clientFilter,
        taskFilter,
        statusFilter,
      }),
    [entries, projectFilter, clientFilter, taskFilter, statusFilter],
  );

  const filteredEntries = useMemo(
    () =>
      applyTimeEntryFilters(entries, {
        projectFilter,
        clientFilter,
        taskFilter,
        statusFilter,
        ...(isHistoryView ? { dateRangePreset, dateFrom, dateTo } : {}),
      }),
    [entries, projectFilter, clientFilter, taskFilter, statusFilter, dateRangePreset, dateFrom, dateTo, isHistoryView],
  );

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

  const historyStats = useMemo(() => {
    const totalSeconds = filteredEntries.reduce((sum, e) => sum + getEntrySeconds(e), 0);
    const billableSeconds = filteredEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + getEntrySeconds(e), 0);
    return { totalSeconds, billableSeconds, count: filteredEntries.length };
  }, [filteredEntries]);

  const formatHm = (seconds: number) => {
    const totalMinutes = Math.round(Math.max(0, seconds) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );
  const monthStart = useMemo(() => startOfMonth(selectedDay), [selectedDay]);
  const monthEnd = useMemo(() => endOfMonth(selectedDay), [selectedDay]);
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );
  const monthGridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const monthGridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const monthGridDays = useMemo(
    () => eachDayOfInterval({ start: monthGridStart, end: monthGridEnd }),
    [monthGridStart, monthGridEnd]
  );
  const weekDayTotals = useMemo(() => {
    return weekDays.reduce<Record<string, number>>((acc, day) => {
      const key = format(day, 'yyyy-MM-dd');
      acc[key] = entriesMatchingFilters.reduce((sum, e) => {
        const d = parseISO(e.started_at || e.start_time);
        if (!isSameDay(d, day)) return sum;
        return sum + getEntrySeconds(e);
      }, 0);
      return acc;
    }, {});
  }, [entriesMatchingFilters, weekDays]);
  const calendarDayTotals = useMemo(() => {
    return monthGridDays.reduce<Record<string, number>>((acc, day) => {
      const key = format(day, 'yyyy-MM-dd');
      acc[key] = entriesMatchingFilters.reduce((sum, e) => {
        const d = parseISO(e.started_at || e.start_time);
        if (!isSameDay(d, day)) return sum;
        return sum + getEntrySeconds(e);
      }, 0);
      return acc;
    }, {});
  }, [entriesMatchingFilters, monthGridDays]);

  const weekTotalSeconds = useMemo(
    () => weekDays.reduce((sum, d) => sum + (weekDayTotals[format(d, 'yyyy-MM-dd')] || 0), 0),
    [weekDays, weekDayTotals],
  );

  const monthTotalSeconds = useMemo(() => {
    return entriesMatchingFilters.reduce((sum, e) => {
      const d = parseISO(e.started_at || e.start_time);
      if (d < monthStart || d > monthEnd) return sum;
      return sum + getEntrySeconds(e);
    }, 0);
  }, [entriesMatchingFilters, monthStart, monthEnd]);

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
  const isCurrentMonth = isSameMonth(selectedDay, new Date());

  const timesheetTableEntries = useMemo(() => {
    let list = entriesMatchingFilters;
    if (timesheetView === 'day') {
      list = list.filter((entry) =>
        isSameDay(parseISO(entry.started_at || entry.start_time), selectedDay),
      );
    } else if (timesheetView === 'week') {
      list = list.filter((entry) => {
        const d = parseISO(entry.started_at || entry.start_time);
        return d >= weekStart && d <= weekEnd;
      });
    }
    return list.sort(
      (a, b) =>
        parseISO(b.started_at || b.start_time).getTime() -
        parseISO(a.started_at || a.start_time).getTime(),
    );
  }, [entriesMatchingFilters, timesheetView, selectedDay, weekStart, weekEnd]);

  const shiftPeriod = (direction: 'prev' | 'next') => {
    const factor = direction === 'prev' ? -1 : 1;
    if (timesheetView === 'month') {
      const next = new Date(selectedDay.getFullYear(), selectedDay.getMonth() + factor, 1);
      setSelectedDay(next);
      setWeekStart(startOfWeek(next, { weekStartsOn: 1 }));
      return;
    }
    if (timesheetView === 'day') {
      const next = direction === 'prev' ? subDays(selectedDay, 1) : addDays(selectedDay, 1);
      setSelectedDay(next);
      setWeekStart(startOfWeek(next, { weekStartsOn: 1 }));
      return;
    }
    const nextWeekStart = direction === 'prev' ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1);
    const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
    setWeekStart(nextWeekStart);
    setSelectedDay((prev) => {
      if (prev >= nextWeekStart && prev <= nextWeekEnd) return prev;
      return nextWeekStart;
    });
  };

  const setTimesheetMode = (mode: 'day' | 'week' | 'month') => {
    setTimesheetView(mode);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', mode);
    setSearchParams(nextParams, { replace: true });
  };

  const handleCreateProjectFromTimer = async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    await createProjectInline(trimmed);
    setNewProjectName('');
    setCreateProjectDialogOpen(false);
  };

  const handleCreateTaskFromTimer = async () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed || !timerProject) return;
    await createTaskInline(trimmed, timerProject);
    setNewTaskTitle('');
    setCreateTaskDialogOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (projectFilter !== 'all') count++;
    if (clientFilter !== 'all') count++;
    if (taskFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (isHistoryView && dateRangePreset !== 'all') count++;
    return count;
  }, [projectFilter, clientFilter, taskFilter, statusFilter, dateRangePreset, isHistoryView]);

  const resetFilters = () => {
    setProjectFilter('all');
    setClientFilter('all');
    setTaskFilter('all');
    setStatusFilter('all');
    setDateRangePreset('all');
    setDateFrom('');
    setDateTo('');
  };

  const applyHistoryDatePreset = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    if (preset !== 'custom') {
      const { from, to } = getDateRangeForPreset(preset);
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
    setSelectedDay(now);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedDay(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
  };

  const setTimesheetMonth = (year: number, monthIndex: number) => {
    const next = new Date(year, monthIndex, 1);
    setSelectedDay(next);
    setWeekStart(startOfWeek(next, { weekStartsOn: 1 }));
  };

  const renderHistoryDateRangeBar = () => (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <div className="flex flex-wrap gap-1.5">
        {HISTORY_DATE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={dateRangePreset === preset.id ? 'default' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => applyHistoryDatePreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setDateRangePreset('custom');
          }}
          className="h-8 w-[140px]"
          aria-label="From date"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setDateRangePreset('custom');
          }}
          className="h-8 w-[140px]"
          aria-label="To date"
        />
      </div>
    </div>
  );

  const renderEntryFilterFields = () => (
    <div className="flex flex-col gap-3 min-w-[200px]">
      <Select value={projectFilter} onValueChange={setProjectFilter}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={clientFilter} onValueChange={setClientFilter}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={taskFilter} onValueChange={setTaskFilter}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All Tasks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tasks</SelectItem>
          {allTasks.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <SelectTrigger className="w-full">
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
  );

  const renderFilterPopover = () => (
    <div className="flex items-center gap-2 shrink-0">
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
          Reset
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative h-8 w-8 p-0" aria-label="Filters">
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
          {renderEntryFilterFields()}
        </PopoverContent>
      </Popover>
    </div>
  );

  const isTodayVisible = (d: Date) => {
    const today = new Date();
    if (timesheetView === 'month') {
      return isCurrentMonth && isSameDay(d, today);
    }
    return isCurrentWeek && isSameDay(d, today);
  };

  const renderWeekPeriodPicker = () => (
    <Popover open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          {isCurrentWeek
            ? `This week ${formatUserDate(weekStart)} – ${formatUserDate(weekEnd)}`
            : `${formatUserDate(weekStart)} – ${formatUserDate(weekEnd)}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={(date) => {
            if (!date) return;
            setSelectedDay(date);
            setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
            setWeekPickerOpen(false);
          }}
          defaultMonth={selectedDay}
          initialFocus
        />
        <div className="border-t p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              goToCurrentWeek();
              setWeekPickerOpen(false);
            }}
          >
            This week
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderWeekDayStrip = () => (
    <div className="relative z-10 grid grid-cols-7 gap-2">
      {weekDays.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const daySeconds = weekDayTotals[key] || 0;
        const isToday = isTodayVisible(d);
        const isSelected =
          timesheetView === 'day' && isSameDay(d, selectedDay);
        const isWeekend = getDay(d) === 0 || getDay(d) === 6;
        const hasHours = daySeconds > 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedDay(d)}
            className={cn(
              'cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
              isSelected
                ? todayHighlightClass
                : isToday
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-card',
              !isSelected && !isToday && isWeekend && 'bg-secondary',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {format(d, 'EEE')}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-foreground">{format(d, 'd MMM')}</p>
            <p
              className={cn(
                'mt-1 text-[13px] font-medium',
                hasHours ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {formatHm(daySeconds)}
            </p>
          </button>
        );
      })}
    </div>
  );

  const renderTimeEntryLogDialog = () => (
    <TimeEntryLogDialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingEntry(null);
          setLogDialogDefaults({});
        }
      }}
      entry={editingEntry}
      defaultProjectId={logDialogDefaults.projectId ?? prefilledProjectId}
      defaultTaskId={logDialogDefaults.taskId ?? prefilledTaskId}
      defaultDate={logDialogDefaults.date}
      defaultHours={logDialogDefaults.hours}
      lockProject={lockPrefilledProject && !editingEntry}
      onSaved={fetchEntries}
    />
  );

  if (isTimesheetView) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
              {(timesheetView === 'day' || timesheetView === 'week') && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Week of {format(weekStart, 'd')}–{format(weekEnd, 'd MMM yyyy')}
                </p>
              )}
              {timesheetView === 'month' && (
                <p className="text-sm text-muted-foreground mt-0.5">{format(monthStart, 'MMMM yyyy')}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/time/history">All logs</Link>
              </Button>
              <div className="flex rounded-lg border bg-muted/50 p-0.5">
                <Button variant={timesheetView === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setTimesheetMode('day')}>Day</Button>
                <Button variant={timesheetView === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setTimesheetMode('week')}>Week</Button>
                <Button variant={timesheetView === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setTimesheetMode('month')}>Month</Button>
              </div>
              <Button variant="outline" onClick={() => openLogDialog()}>
                Manual Log
              </Button>
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link to="/time/timer">
                  <Plus className="mr-2 h-4 w-4" />
                  Track time
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => shiftPeriod('prev')} aria-label="Previous period">
                ←
              </Button>
              {timesheetView === 'month' ? (
                <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" type="button">
                      {isCurrentMonth
                        ? `This month ${format(monthStart, 'MMM yyyy')}`
                        : format(monthStart, 'MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Select
                          value={String(selectedDay.getMonth())}
                          onValueChange={(m) => setTimesheetMonth(selectedDay.getFullYear(), Number(m))}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {format(new Date(2024, i, 1), 'MMMM')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={String(selectedDay.getFullYear())}
                          onValueChange={(y) => setTimesheetMonth(Number(y), selectedDay.getMonth())}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 11 }, (_, i) => {
                              const year = new Date().getFullYear() - 5 + i;
                              return (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          goToCurrentMonth();
                          setMonthPickerOpen(false);
                        }}
                      >
                        This month
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                renderWeekPeriodPicker()
              )}
              <Button variant="outline" size="sm" onClick={() => shiftPeriod('next')} aria-label="Next period">
                →
              </Button>
              {(timesheetView === 'day' || timesheetView === 'week') && (
                <span className="text-sm text-muted-foreground">
                  Week total: <span className="font-mono font-medium text-foreground">{formatHm(weekTotalSeconds)}</span>
                </span>
              )}
              {timesheetView === 'month' && (
                <span className="text-sm text-muted-foreground">
                  Month total: <span className="font-mono font-medium text-foreground">{formatHm(monthTotalSeconds)}</span>
                </span>
              )}
            </div>
            {renderFilterPopover()}
          </div>

          {(timesheetView === 'day' || timesheetView === 'week') && (
            <div className="space-y-4">
              {renderWeekDayStrip()}
              {timesheetView === 'day' ? (
                <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <TimeEntriesTable
                      variant="timesheetDay"
                      entries={timesheetTableEntries}
                      clientById={clientById}
                      formatUserDate={formatUserDate}
                      getEntrySeconds={getEntrySeconds}
                      getStatusBadge={getStatusBadge}
                      onEdit={openLogDialog}
                      onDelete={handleDelete}
                      onResume={resumeEntry}
                      emptyMessage="No entries for this day."
                      emptyTrackTimeHref="/time/timer"
                    />
                  </div>
                  {timesheetTableEntries.length > 0 && (
                    <div className="flex items-center justify-end border-t border-border px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        Day total:{' '}
                        <span className="font-mono">
                          {formatHm(weekDayTotals[format(selectedDay, 'yyyy-MM-dd')] || 0)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0 overflow-x-auto">
                    <TimeEntriesTable
                      entries={timesheetTableEntries}
                      clientById={clientById}
                      formatUserDate={formatUserDate}
                      getEntrySeconds={getEntrySeconds}
                      getStatusBadge={getStatusBadge}
                      onEdit={openLogDialog}
                      onDelete={handleDelete}
                      onResume={resumeEntry}
                      emptyMessage="No entries for this week."
                      emptyTrackTimeHref="/time/timer"
                    />
                    {timesheetTableEntries.length > 0 && (
                      <div className="flex items-center justify-end bg-muted/20 px-4 py-3 border-t">
                        <p className="text-sm font-medium">
                          Week total:{' '}
                          <span className="font-mono">{formatHm(weekTotalSeconds)}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {timesheetView === 'month' && (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                  <div key={label} className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {label}
                  </div>
                ))}
                {monthGridDays.map((d) => {
                  const key = format(d, 'yyyy-MM-dd');
                  const inMonth = d >= monthStart && d <= monthEnd;
                  const total = calendarDayTotals[key] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedDay(d);
                        setTimesheetMode('day');
                        setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
                      }}
                      className={cn(
                        'rounded-md border min-h-[88px] p-2 text-left',
                        inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
                        isTodayVisible(d) && todayHighlightClass,
                      )}
                    >
                      <p className="text-xs">{format(d, 'd')}</p>
                      <p className="text-xs font-mono mt-2">{total ? formatHm(total) : '0:00'}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Summary only. Click a day to open Day view and edit entries.
              </p>
            </div>
          )}
          {renderTimeEntryLogDialog()}
        </div>
      </AppLayout>
    );
  }

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
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{isTimerView ? 'Timer' : 'All logs'}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isHistoryView && (
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
          <Button variant="outline" onClick={() => openLogDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Manual Log
          </Button>
          {renderTimeEntryLogDialog()}
          <Button className="bg-green-600 hover:bg-green-700 text-white" asChild>
            <Link to="/time/timer">
              <Plus className="mr-2 h-4 w-4" />
              Track time
            </Link>
          </Button>
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

        <Dialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>Add a new project and assign it to this timer.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateProjectDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateProjectFromTimer} disabled={!newProjectName.trim()}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create task</DialogTitle>
              <DialogDescription>Create a task in the selected project and assign it to this timer.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTaskFromTimer} disabled={!newTaskTitle.trim() || !timerProject}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isTimerView ? (
          /* Timer view: centered, spacious layout */
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Context: project/task first, notes optional */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1">
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
                              <span className="flex flex-col items-start gap-0.5">
                                <span>{p.name}</span>
                                {archivedClientLabelForProject(p) ? (
                                  <span className="text-xs text-muted-foreground">{archivedClientLabelForProject(p)}</span>
                                ) : null}
                              </span>
                            </CommandItem>
                          ))}
                          {projectQuery.trim() && !projects.some((p) => p.name.toLowerCase() === projectQuery.trim().toLowerCase()) && (
                            <CommandItem
                              value={`create-${projectQuery}`}
                              onSelect={async () => {
                                await createProjectInline(projectQuery);
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
                    onClick={() => setCreateProjectDialogOpen(true)}
                  >
                    + Create project
                  </Button>
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task</Label>
                  <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full min-w-0 justify-start border-0 bg-muted/50" disabled={!timerProject}>
                        <span className="truncate text-left">
                          {selectedTimerTask?.title || (timerProject ? 'No task' : 'Select project first')}
                        </span>
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
                                await createTaskInline(taskQuery, timerProject);
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
                    onClick={() => setCreateTaskDialogOpen(true)}
                  >
                    + Create task
                  </Button>
                </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="timer-billable" checked={timerBillable} onCheckedChange={setTimerBillable} />
                  <Label htmlFor="timer-billable" className="text-sm text-muted-foreground shrink-0">Billable</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</Label>
                <Input
                  placeholder="Optional notes"
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  className="text-base border-0 bg-muted/50 focus-visible:ring-2"
                />
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
                    <Pause className="mr-2 h-5 w-5" />
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
                      const startLabel = format(new Date(seg.startMs), 'MMM d, HH:mm');
                      const endLabel = isRunning ? 'now' : format(new Date(endMs), 'MMM d, HH:mm');
                      return (
                        <li
                          key={i}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm"
                        >
                          <span className="font-medium">
                            {i + 1}. {startLabel} - {endLabel}
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
                  <p className="text-2xl font-bold">{formatDuration(historyStats.totalSeconds, true)}</p>
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
                  <p className="text-2xl font-bold">{formatDuration(historyStats.billableSeconds, true)}</p>
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
                  <p className="text-2xl font-bold">{historyStats.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          {renderHistoryDateRangeBar()}
          {renderFilterPopover()}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {selectionMode && filteredEntries.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b">
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
            <TimeEntriesTable
              entries={filteredEntries}
              clientById={clientById}
              formatUserDate={formatUserDate}
              getEntrySeconds={getEntrySeconds}
              getStatusBadge={getStatusBadge}
              onEdit={openLogDialog}
              onDelete={handleDelete}
              onResume={resumeEntry}
              showOpenDayLink
              selectionMode={selectionMode}
              selectedEntryIds={selectedEntryIds}
              onToggleSelection={toggleEntrySelection}
              onRowClick={openLogDetails}
              headerActions={
                filteredEntries.length > 0 ? (
                  selectionMode ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectionMode(false);
                        clearSelection();
                      }}
                    >
                      Done
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                      Select
                    </Button>
                  )
                ) : undefined
              }
            />
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/time?view=day&edit=${selectedLogEntry.id}`}>Open in Day</Link>
                  </Button>
                  {selectedLogEntry.project_id ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/projects/${selectedLogEntry.project_id}`}>Open Project</Link>
                    </Button>
                  ) : null}
                  {selectedLogEntry.project_id ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/time/history?project=${selectedLogEntry.project_id}${selectedLogEntry.task_id ? `&task=${selectedLogEntry.task_id}` : ''}`}>Related Logs</Link>
                    </Button>
                  ) : null}
                </div>
                <p><span className="text-muted-foreground">Notes:</span> {selectedLogEntry.description || '—'}</p>
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
