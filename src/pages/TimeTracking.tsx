import { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Clock, Play, Square, Calendar, Trash2, Pencil, DollarSign, Filter, Download, Upload, List } from 'lucide-react';
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
  const [timerDescription, setTimerDescription] = useState('');
  const [timerProject, setTimerProject] = useState<string>('');
  const [timerTask, setTimerTask] = useState<string>('');
  const [timerBillable, setTimerBillable] = useState(true);
  /** Draft segments: multiple start/stop before saving. Last segment may have endMs null (running). */
  const [draftSegments, setDraftSegments] = useState<DraftSegment[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerStartMsRef = useRef<number | null>(null);
  
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

  // Elapsed time for running segment (last segment has endMs null)
  const isLocalTimerRunning = draftSegments.length > 0 && draftSegments[draftSegments.length - 1].endMs == null;
  const runningSegmentStartMs = isLocalTimerRunning ? draftSegments[draftSegments.length - 1].startMs : null;
  useEffect(() => {
    if (!isLocalTimerRunning || runningSegmentStartMs == null) {
      timerStartMsRef.current = null;
      setElapsedSeconds(0);
      return;
    }
    timerStartMsRef.current = runningSegmentStartMs;
    const tick = () => {
      if (timerStartMsRef.current == null) return;
      setElapsedSeconds(Math.floor((Date.now() - timerStartMsRef.current) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isLocalTimerRunning, runningSegmentStartMs]);

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
        .select('id, name, client_id')
        .eq('status', 'active')
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

  const startTimer = () => {
    const now = Date.now();
    setDraftSegments((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.endMs == null) return prev; // already running
      return [...prev, { startMs: now, endMs: null }];
    });
    toast({ title: 'Timer started' });
  };

  const stopTimer = () => {
    setDraftSegments((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.endMs != null) return prev;
      return [...prev.slice(0, -1), { ...last, endMs: Date.now() }];
    });
    toast({ title: 'Timer paused. Start again to add more time, or "Save entry" when done.' });
  };

  const getDraftTotalSeconds = () => {
    return draftSegments.reduce((sum, seg) => {
      const end = seg.endMs ?? Date.now();
      return sum + Math.max(0, Math.round((end - seg.startMs) / 1000));
    }, 0);
  };

  const logTimeFromTimer = async () => {
    if (draftSegments.length === 0 || !user) return;
    if (!timerDescription?.trim()) {
      toast({ title: 'Description required', description: 'Enter what you worked on before saving.', variant: 'destructive' });
      return;
    }
    const now = Date.now();
    const segmentsToSave = draftSegments.map((s) => ({
      startMs: s.startMs,
      endMs: s.endMs ?? now,
    }));
    const firstStart = new Date(segmentsToSave[0].startMs);

    try {
      const { data: entryRow, error: entryError } = await supabase
        .from('time_entries')
        .insert({
          description: timerDescription || null,
          project_id: timerProject || null,
          task_id: timerTask || null,
          billable: timerBillable,
          billing_status: timerBillable ? 'unbilled' : 'not_billable',
          user_id: user.id,
          start_time: firstStart.toISOString(),
          end_time: firstStart.toISOString(),
        })
        .select('id')
        .single();
      if (entryError) throw entryError;
      if (!entryRow?.id) throw new Error('No id returned');

      for (const seg of segmentsToSave) {
        const durationSeconds = Math.max(0, Math.round((seg.endMs - seg.startMs) / 1000));
        await supabase.from('time_entry_segments').insert({
          time_entry_id: entryRow.id,
          start_time: new Date(seg.startMs).toISOString(),
          end_time: new Date(seg.endMs).toISOString(),
          duration_seconds: durationSeconds,
        });
      }

      setDraftSegments([]);
      setTimerDescription('');
      setTimerProject('');
      setTimerTask('');
      setTimerBillable(true);
      fetchEntries();
      const totalSec = segmentsToSave.reduce((s, seg) => s + Math.round((seg.endMs - seg.startMs) / 1000), 0);
      toast({ title: 'Time logged', description: formatDurationFromSeconds(totalSec) });
    } catch (error: any) {
      toast({
        title: 'Error logging time',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const discardTimerSegment = () => {
    setDraftSegments([]);
    setTimerDescription('');
    setTimerProject('');
    setTimerTask('');
    setTimerBillable(true);
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
      setDialogProject('');
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
      if (editingEntry) {
        await supabase
          .from('time_entries')
          .update({
            description: dialogDescription || null,
            project_id: dialogProject,
            task_id: dialogTask || null,
            billable: dialogBillable,
            billing_status: dialogBillable ? 'unbilled' : 'not_billable',
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
      }
      
      setIsDialogOpen(false);
      setEditingEntry(null);
      fetchEntries();
    } catch (error: any) {
      toast({
        title: 'Error saving entry',
        description: error.message,
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
      toast({ title: 'Entry deleted' });
      fetchEntries();
    } catch (error: any) {
      toast({
        title: 'Error deleting entry',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatDurationFromSeconds = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
    if (mins > 0) return `${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
    return `${secs}s`;
  };

  const formatElapsed = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      fetchEntries();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err?.message, variant: 'destructive' });
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
              {isTimerView ? 'Track time and save entries' : 'Log and manage your billable hours'}
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
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadTimeTemplate}>
                  Download template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportTimeCsv}>
                  Export CSV {filteredEntries.length > 0 ? `(${filteredEntries.length})` : ''}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
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
                  <Select value={dialogProject} onValueChange={setDialogProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dialog_task">Task (optional)</Label>
                  <Select value={dialogTask || "none"} onValueChange={(v) => setDialogTask(v === "none" ? "" : v)} disabled={!dialogProject}>
                    <SelectTrigger>
                      <SelectValue placeholder={dialogProject ? "Select task" : "Select a project first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No task</SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        Total: {formatDurationFromSeconds(getDialogRangesTotalSeconds())}
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
                  <Select value={timerProject || 'none'} onValueChange={(v) => setTimerProject(v === 'none' ? '' : v)}>
                    <SelectTrigger className="border-0 bg-muted/50">
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task</Label>
                  <Select value={timerTask || 'none'} onValueChange={(v) => setTimerTask(v === 'none' ? '' : v)} disabled={!timerProject}>
                    <SelectTrigger className="border-0 bg-muted/50">
                      <SelectValue placeholder={timerProject ? 'No task' : 'Select project first'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No task</SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {draftSegments.length > 0 ? formatElapsed(getDraftTotalSeconds()) : '00:00:00'}
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
                    Paused and resumed chunks. Save entry to log them as one time entry.
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
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billable Hours</p>
                  <p className="text-2xl font-bold">{billableHours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Calendar className="h-5 w-5 text-accent-foreground" />
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
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No time entries found</p>
                <p className="text-sm">Start the timer or log time manually</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
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
                        {getEntrySeconds(entry) > 0 ? formatDurationFromSeconds(getEntrySeconds(entry)) : '—'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openLogDialog(entry)}
                          >
                            <Pencil className="h-4 w-4" />
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
            )}
          </CardContent>
        </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
