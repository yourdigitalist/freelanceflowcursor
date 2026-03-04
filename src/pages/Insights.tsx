import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Copy, Mail } from '@/components/icons';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

type PeriodKey = 'today' | 'week' | 'month';

interface Client {
  id: string;
  name: string;
  email: string | null;
}

interface Project {
  id: string;
  name: string;
  client_id: string | null;
}

export default function Insights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [clientId, setClientId] = useState<string>('');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [includeHours, setIncludeHours] = useState(true);
  const [includeTracked, setIncludeTracked] = useState(true);
  const [includeApprovalsSent, setIncludeApprovalsSent] = useState(true);
  const [includePending, setIncludePending] = useState(true);
  const [includeApproved, setIncludeApproved] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('clients').select('id, name, email').eq('user_id', user.id).order('name'),
      supabase.from('projects').select('id, name, client_id').eq('user_id', user.id).order('name'),
    ]).then(([c, p]) => {
      setClients((c.data as Client[]) || []);
      setProjects((p.data as Project[]) || []);
    });
  }, [user]);

  const projectsForClient = clientId
    ? projects.filter((pr) => pr.client_id === clientId)
    : projects;

  const getDateRange = useCallback((key: PeriodKey) => {
    const now = new Date();
    switch (key) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
  }, []);

  const getPeriodLabel = (key: PeriodKey) => {
    switch (key) {
      case 'today': return 'today';
      case 'week': return 'this week';
      case 'month': return 'this month';
      default: return 'this period';
    }
  };

  const toggleProject = (id: string) => {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const generateSummary = async () => {
    if (!user) return;
    const { start, end } = getDateRange(period);
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    let projectIdsToUse = projectIds.length > 0 ? projectIds : projectsForClient.map((p) => p.id);
    if (clientId && projectIdsToUse.length === 0) {
      projectIdsToUse = projects.filter((p) => p.client_id === clientId).map((p) => p.id);
    }

    setGenerating(true);
    try {
      let timeEntries: { description: string | null; duration_minutes: number | null; start_time: string; project_id: string | null; projects: { name: string } | null }[] = [];
      let reviewRequests: { title: string; status: string; sent_at: string | null; client_id: string | null; project_id: string | null }[] = [];
      let tasksList: { title: string; status: string | null; project_id: string | null; projects: { name: string } | null }[] = [];
      let invoicesList: { invoice_number: string; status: string | null; total: number | null; due_date: string | null }[] = [];

      if (includeTracked || includeHours) {
        let q = supabase
          .from('time_entries')
          .select('description, duration_minutes, start_time, project_id, projects(name)')
          .eq('user_id', user.id)
          .gte('start_time', startStr)
          .lte('start_time', endStr);
        if (projectIdsToUse.length > 0) {
          q = q.in('project_id', projectIdsToUse);
        } else if (clientId) {
          const clientProjectIds = projects.filter((p) => p.client_id === clientId).map((p) => p.id);
          if (clientProjectIds.length > 0) q = q.in('project_id', clientProjectIds);
        }
        const { data: te } = await q.order('start_time');
        timeEntries = (te || []) as typeof timeEntries;
      }

      if (includeApprovalsSent || includePending || includeApproved) {
        let q = supabase
          .from('review_requests')
          .select('title, status, sent_at, client_id, project_id, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startStr)
          .lte('created_at', endStr);
        if (clientId) q = q.eq('client_id', clientId);
        if (projectIdsToUse.length > 0) q = q.in('project_id', projectIdsToUse);
        const { data: rr } = await q;
        reviewRequests = (rr || []) as typeof reviewRequests;
      }

      if (includeTasks && projectIdsToUse.length > 0) {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('title, status, project_id, projects(name)')
          .eq('user_id', user.id)
          .in('project_id', projectIdsToUse)
          .order('position');
        tasksList = (tasksData || []) as typeof tasksList;
      }

      if (includeInvoices) {
        let invQ = supabase
          .from('invoices')
          .select('invoice_number, status, total, due_date')
          .eq('user_id', user.id)
          .neq('status', 'paid');
        if (clientId) invQ = invQ.eq('client_id', clientId);
        if (projectIdsToUse.length > 0) invQ = invQ.in('project_id', projectIdsToUse);
        const { data: invData } = await invQ;
        invoicesList = (invData || []) as typeof invoicesList;
      }

      const timeEntriesPayload = timeEntries.map((e) => ({
        description: e.description,
        durationMinutes: e.duration_minutes,
        projectName: (e.projects as { name: string } | null)?.name || '',
        date: e.start_time,
      }));
      const reviewRequestsPayload = reviewRequests.map((r) => ({
        title: r.title,
        status: r.status,
        sentAt: r.sent_at,
      }));
      const tasksPayload = tasksList.map((t) => ({
        title: t.title,
        status: t.status,
        projectName: (t.projects as { name: string } | null)?.name || '',
      }));
      const invoicesPayload = invoicesList.map((i) => ({
        invoice_number: i.invoice_number,
        status: i.status,
        total: i.total,
        due_date: i.due_date,
      }));

      const hasWork =
        timeEntries.length > 0 ||
        reviewRequests.length > 0 ||
        tasksList.length > 0 ||
        invoicesList.length > 0;
      if (!hasWork) {
        toast({
          title: 'No data in scope',
          description: 'Add time entries, tasks, approvals, or invoices for the selected period/client/projects, or adjust the toggles.',
          variant: 'destructive',
        });
        setGenerating(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('generate-client-summary', {
        body: {
          access_token: accessToken,
          timeEntries: timeEntriesPayload,
          reviewRequests: reviewRequestsPayload,
          tasks: tasksPayload,
          invoices: invoicesPayload,
          options: {
            includeHours,
            includeTracked,
            includeApprovalsSent,
            includePending,
            includeApproved,
            includeTasks,
            includeInvoices,
          },
          periodLabel: getPeriodLabel(period),
        },
      });

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError && error.context) {
          try {
            const body = await (error.context as Response).json();
            if (body?.error && typeof body.error === 'string') msg = body.error;
          } catch {
            // ignore
          }
        }
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }

      const text = (data as { summary?: string } | null)?.summary;
      if (text) {
        setSummary(text);
        toast({ title: 'Summary generated', description: 'Edit if needed, then copy or send to client.' });
      } else {
        toast({ title: 'No summary returned', description: 'Try a different range or add GEMINI_API_KEY to Edge Function secrets.', variant: 'destructive' });
      }
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : 'Failed to generate summary.';
      if (e instanceof FunctionsHttpError && e.context) {
        try {
          const body = await (e.context as Response).json();
          if (body?.error && typeof body.error === 'string') msg = body.error;
        } catch {
          // ignore
        }
      }
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!summary.trim()) {
      toast({ title: 'Nothing to copy', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(summary);
    toast({ title: 'Copied to clipboard' });
  };

  const clientEmail = clientId ? clients.find((c) => c.id === clientId)?.email : null;
  const mailtoHref = clientEmail
    ? `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(`Work summary ${getPeriodLabel(period)}`)}&body=${encodeURIComponent(summary)}`
    : `mailto:?subject=${encodeURIComponent(`Work summary ${getPeriodLabel(period)}`)}&body=${encodeURIComponent(summary)}`;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Smart Summaries</h1>
          <p className="text-muted-foreground mt-1">
            Generate a short email summary of what you worked on to send to your client.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scope</CardTitle>
            <CardDescription>Choose the period and optionally filter by client or projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select value={clientId || 'all'} onValueChange={(v) => { setClientId(v === 'all' ? '' : v); setProjectIds([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projects (optional – leave all unchecked for all)</Label>
              <div className="flex flex-wrap gap-3 border rounded-md p-3 max-h-40 overflow-y-auto">
                {projectsForClient.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Select a client or use all projects.</p>
                ) : (
                  projectsForClient.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={projectIds.includes(p.id)}
                        onCheckedChange={() => toggleProject(p.id)}
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Include in summary</CardTitle>
            <CardDescription>Toggles for what to mention in the email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hours">Hours (time tracked)</Label>
              <Switch id="hours" checked={includeHours} onCheckedChange={setIncludeHours} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tracked">Time tracked (descriptions)</Label>
              <Switch id="tracked" checked={includeTracked} onCheckedChange={setIncludeTracked} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="approvals-sent">Approvals sent</Label>
              <Switch id="approvals-sent" checked={includeApprovalsSent} onCheckedChange={setIncludeApprovalsSent} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pending">Pending approvals</Label>
              <Switch id="pending" checked={includePending} onCheckedChange={setIncludePending} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="approved">Approved</Label>
              <Switch id="approved" checked={includeApproved} onCheckedChange={setIncludeApproved} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tasks">Tasks (with status)</Label>
              <Switch id="tasks" checked={includeTasks} onCheckedChange={setIncludeTasks} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="invoices">Outstanding invoices</Label>
              <Switch id="invoices" checked={includeInvoices} onCheckedChange={setIncludeInvoices} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={generateSummary} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating…' : 'Generate summary'}
          </Button>
        </div>

        {(summary || generating) && (
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Edit if needed, then copy or open in your email client.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summary will appear here…"
                rows={6}
                className="resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!summary.trim()} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={summary.trim() ? mailtoHref : '#'} className={cn("gap-2", !summary.trim() && "pointer-events-none opacity-50")}>
                    <Mail className="h-4 w-4" />
                    Send to client
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
