import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Clock, Play, Square, Calendar, Trash2, Pencil, DollarSign, Filter } from 'lucide-react';
import { format, differenceInMinutes, parseISO, startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  duration_minutes: number | null;
  billable: boolean;
  hourly_rate: number | null;
  project_id: string | null;
  task_id: string | null;
  billing_status: string | null;
  projects: { name: string; client_id: string | null } | null;
  tasks: { title: string } | null;
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
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [timerDescription, setTimerDescription] = useState('');
  const [timerProject, setTimerProject] = useState<string>('');
  const [timerTask, setTimerTask] = useState<string>('');
  const [timerBillable, setTimerBillable] = useState(true);
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
  const [dialogHours, setDialogHours] = useState<string>('');
  const [dialogDescription, setDialogDescription] = useState<string>('');
  const [dialogDate, setDialogDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dialogBillable, setDialogBillable] = useState(true);

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

  // Elapsed time: use ref + seconds so display is accurate (avoids timezone/DB sync issues)
  useEffect(() => {
    if (!activeTimer) {
      timerStartMsRef.current = null;
      setElapsedSeconds(0);
      return;
    }
    timerStartMsRef.current = new Date(activeTimer.start_time).getTime();
    const tick = () => {
      if (timerStartMsRef.current == null) return;
      setElapsedSeconds(Math.floor((Date.now() - timerStartMsRef.current) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.id, activeTimer?.start_time]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          projects(name, client_id),
          tasks(title)
        `)
        .order('start_time', { ascending: false })
        .limit(200);

      if (error) throw error;
      
      const completedEntries = data?.filter(e => e.end_time) || [];
      const runningEntry = data?.find(e => !e.end_time);
      
      setEntries(completedEntries);
      if (runningEntry) {
        setActiveTimer(runningEntry);
        setTimerDescription(runningEntry.description || '');
        setTimerProject(runningEntry.project_id || '');
        setTimerTask(runningEntry.task_id || '');
        setTimerBillable(runningEntry.billable);
      } else {
        setTimerTask('');
      }
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

  const startTimer = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          description: timerDescription || null,
          start_time: new Date().toISOString(),
          project_id: timerProject || null,
          task_id: timerTask || null,
          billable: timerBillable,
          billing_status: timerBillable ? 'unbilled' : 'not_billable',
          user_id: user!.id,
        })
        .select(`*, projects(name, client_id), tasks(title)`)
        .single();

      if (error) throw error;
      setActiveTimer(data);
      toast({ title: 'Timer started' });
    } catch (error: any) {
      toast({
        title: 'Error starting timer',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    const endTime = new Date();
    const startMs = timerStartMsRef.current ?? new Date(activeTimer.start_time).getTime();
    const durationMinutes = Math.max(0, Math.floor((endTime.getTime() - startMs) / 60_000));

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          description: timerDescription || null,
          project_id: timerProject || null,
          task_id: timerTask || null,
          billable: timerBillable,
          billing_status: timerBillable ? 'unbilled' : 'not_billable',
        })
        .eq('id', activeTimer.id);

      if (error) throw error;

      setActiveTimer(null);
      setTimerDescription('');
      setTimerProject('');
      setTimerTask('');
      setTimerBillable(true);
      setElapsedSeconds(0);
      timerStartMsRef.current = null;
      fetchEntries();
      toast({ title: 'Timer stopped', description: `Logged ${formatDuration(durationMinutes)}. You can edit the entry below.` });
    } catch (error: any) {
      toast({
        title: 'Error stopping timer',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openLogDialog = (entry?: TimeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setDialogProject(entry.project_id || '');
      setDialogTask(entry.task_id || '');
      setDialogDescription(entry.description || '');
      setDialogDate(format(parseISO(entry.start_time), 'yyyy-MM-dd'));
      setDialogBillable(entry.billable);
      if (entry.end_time) {
        setDialogTimeMode('start_end');
        setDialogStartTime(format(parseISO(entry.start_time), 'HH:mm'));
        setDialogEndTime(format(parseISO(entry.end_time), 'HH:mm'));
        setDialogHours('');
      } else {
        setDialogTimeMode('manual');
        setDialogStartTime('09:00');
        setDialogEndTime('17:00');
        setDialogHours(entry.duration_minutes ? (entry.duration_minutes / 60).toString() : '');
      }
    } else {
      setEditingEntry(null);
      setDialogProject('');
      setDialogTask('');
      setDialogTimeMode('manual');
      setDialogStartTime('09:00');
      setDialogEndTime('17:00');
      setDialogHours('');
      setDialogDescription('');
      setDialogDate(format(new Date(), 'yyyy-MM-dd'));
      setDialogBillable(true);
    }
    setIsDialogOpen(true);
  };

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

    let startTime: Date;
    let endTime: Date;
    let durationMinutes: number;

    if (dialogTimeMode === 'start_end') {
      startTime = new Date(`${dialogDate}T${dialogStartTime}:00`);
      endTime = new Date(`${dialogDate}T${dialogEndTime}:00`);
      if (endTime <= startTime) {
        toast({
          title: 'Invalid times',
          description: 'End time must be after start time',
          variant: 'destructive',
        });
        return;
      }
      durationMinutes = differenceInMinutes(endTime, startTime);
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
      // Exact minutes from hours, no rounding up (floor so we never round up)
      durationMinutes = Math.floor(hours * 60);
      if (durationMinutes <= 0) {
        toast({
          title: 'Invalid hours',
          description: 'Please enter at least 0.01 hours',
          variant: 'destructive',
        });
        return;
      }
      startTime = new Date(`${dialogDate}T${dialogStartTime}:00`);
      endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    }

    const entryData = {
      description: dialogDescription || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      project_id: dialogProject,
      task_id: dialogTask || null,
      billable: dialogBillable,
      billing_status: dialogBillable ? 'unbilled' : 'not_billable',
      user_id: user!.id,
    };

    try {
      if (editingEntry) {
        const { error } = await supabase
          .from('time_entries')
          .update(entryData)
          .eq('id', editingEntry.id);
        if (error) throw error;
        toast({ title: 'Time entry updated' });
      } else {
        const { error } = await supabase
          .from('time_entries')
          .insert(entryData);
        if (error) throw error;
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
      const entryDate = parseISO(entry.start_time);
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

  const totalHours = filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
  const billableHours = filteredEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
            <p className="text-muted-foreground">
              Log and manage your billable hours
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openLogDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEntry ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
                <DialogDescription>
                  {editingEntry ? 'Update this time entry' : 'Log time for a project task'}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dialog_start_time">Start time *</Label>
                      <Input
                        id="dialog_start_time"
                        type="time"
                        value={dialogStartTime}
                        onChange={(e) => setDialogStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dialog_end_time">End time *</Label>
                      <Input
                        id="dialog_end_time"
                        type="time"
                        value={dialogEndTime}
                        onChange={(e) => setDialogEndTime(e.target.value)}
                        required
                      />
                    </div>
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
                  <Button type="submit">{editingEntry ? 'Update' : 'Log Time'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Timer Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
                <Input
                  placeholder="What are you working on?"
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  className="lg:flex-1"
                />
                <Select value={timerProject || 'none'} onValueChange={(v) => setTimerProject(v === 'none' ? '' : v)}>
                  <SelectTrigger className="lg:w-48">
                    <SelectValue placeholder="Project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={timerTask || 'none'} onValueChange={(v) => setTimerTask(v === 'none' ? '' : v)} disabled={!timerProject}>
                  <SelectTrigger className="lg:w-48">
                    <SelectValue placeholder={timerProject ? 'Task (optional)' : 'Select project first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No task</SelectItem>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    id="timer-billable"
                    checked={timerBillable}
                    onCheckedChange={setTimerBillable}
                  />
                  <Label htmlFor="timer-billable" className="text-sm">Billable</Label>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-mono font-bold text-primary min-w-[140px] text-center">
                  {activeTimer ? formatElapsed(elapsedSeconds) : '00:00:00'}
                </div>
                {activeTimer ? (
                  <Button size="lg" variant="destructive" onClick={stopTimer}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                ) : (
                  <Button size="lg" onClick={startTimer}>
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                        {format(parseISO(entry.start_time), 'MMM d, yyyy')}
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
                        {entry.duration_minutes ? `${(entry.duration_minutes / 60).toFixed(1)}h` : '—'}
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
    </AppLayout>
  );
}
