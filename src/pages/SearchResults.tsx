import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SlotIcon } from '@/contexts/IconSlotContext';

interface ProjectResult {
  id: string;
  name: string;
  status: string | null;
}

interface ClientResult {
  id: string;
  name: string;
  company: string | null;
}

interface InvoiceResult {
  id: string;
  invoice_number: string;
  status: string | null;
  total: number | null;
}

interface TaskResult {
  id: string;
  title: string;
  project_id: string | null;
  projects: { name: string } | null;
}

interface NoteResult {
  id: string;
  title: string;
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q')?.trim() || '';
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectResult[]>([]);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResult[]>([]);
  const [tasks, setTasks] = useState<TaskResult[]>([]);
  const [notes, setNotes] = useState<NoteResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !q) {
      setLoading(false);
      setProjects([]);
      setClients([]);
      setInvoices([]);
      setTasks([]);
      setNotes([]);
      return;
    }
    const pattern = `%${q}%`;
    Promise.all([
      supabase
        .from('projects')
        .select('id, name, status')
        .eq('user_id', user.id)
        .ilike('name', pattern)
        .limit(10),
      Promise.all([
        supabase.from('clients').select('id, name, company').eq('user_id', user.id).ilike('name', pattern).limit(10),
        supabase.from('clients').select('id, name, company').eq('user_id', user.id).ilike('company', pattern).limit(10),
      ]).then(([byName, byCompany]) => {
        const byId = new Map<string, ClientResult>();
        (byName.data || []).forEach((r) => byId.set(r.id, r as ClientResult));
        (byCompany.data || []).forEach((r) => byId.set(r.id, r as ClientResult));
        return Array.from(byId.values()).slice(0, 10);
      }),
      supabase
        .from('invoices')
        .select('id, invoice_number, status, total')
        .eq('user_id', user.id)
        .ilike('invoice_number', pattern)
        .limit(10),
      Promise.all([
        supabase
          .from('tasks')
          .select('id, title, project_id, projects(name)')
          .eq('user_id', user.id)
          .ilike('title', pattern)
          .limit(10),
        supabase
          .from('tasks')
          .select('id, title, project_id, projects(name)')
          .eq('user_id', user.id)
          .not('description', 'is', null)
          .ilike('description', pattern)
          .limit(10),
      ]).then(([byTitle, byDesc]) => {
        const byId = new Map<string, TaskResult>();
        (byTitle.data || []).forEach((r) => byId.set(r.id, r as TaskResult));
        (byDesc.data || []).forEach((r) => byId.set(r.id, r as TaskResult));
        return Array.from(byId.values()).slice(0, 10);
      }),
      Promise.all([
        supabase.from('notes').select('id, title').eq('user_id', user.id).ilike('title', pattern).limit(10),
        supabase.from('notes').select('id, title').eq('user_id', user.id).not('content', 'is', null).ilike('content', pattern).limit(10),
      ]).then(([byTitle, byContent]) => {
        const byId = new Map<string, NoteResult>();
        (byTitle.data || []).forEach((r) => byId.set(r.id, r as NoteResult));
        (byContent.data || []).forEach((r) => byId.set(r.id, r as NoteResult));
        return Array.from(byId.values()).slice(0, 10);
      }),
    ]).then(([p, c, i, t, n]) => {
      setProjects((p.data as ProjectResult[]) || []);
      setClients(Array.isArray(c) ? c : []);
      setInvoices((i.data as InvoiceResult[]) || []);
      setTasks(Array.isArray(t) ? t : []);
      setNotes(Array.isArray(n) ? n : []);
      setLoading(false);
    });
  }, [user, q]);

  const hasResults = projects.length > 0 || clients.length > 0 || invoices.length > 0 || tasks.length > 0 || notes.length > 0;
  const isEmpty = !loading && q && !hasResults;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Search results</h1>
          <p className="text-muted-foreground">
            {q ? `Results for "${q}"` : 'Enter a search term in the bar above.'}
          </p>
        </div>

        {loading && (
          <p className="text-muted-foreground">Searching…</p>
        )}

        {!q && !loading && (
          <p className="text-muted-foreground">Type something and press Enter to search across projects, clients, invoices, tasks, and notes.</p>
        )}

        {isEmpty && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <SlotIcon slot="empty_projects" className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{q}".</p>
              <p className="text-sm mt-2">Try a different term or check spelling.</p>
            </CardContent>
          </Card>
        )}

        {!loading && hasResults && (
          <div className="space-y-6">
            {projects.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {projects.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/projects/${p.id}`}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <SlotIcon slot="sidebar_projects" className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{p.name}</span>
                            {p.status && (
                              <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-sm">View →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {clients.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {clients.map((c) => (
                      <li key={c.id}>
                        <Link
                          to={`/clients?open=${c.id}`}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <SlotIcon slot="sidebar_clients" className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{c.name}</span>
                            {c.company && (
                              <span className="text-xs text-muted-foreground">{c.company}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-sm">View →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {invoices.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {invoices.map((inv) => (
                      <li key={inv.id}>
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <SlotIcon slot="sidebar_invoices" className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{inv.invoice_number}</span>
                            {inv.status && (
                              <span className="text-xs text-muted-foreground capitalize">{inv.status}</span>
                            )}
                            {inv.total != null && (
                              <span className="text-xs text-muted-foreground">
                                {typeof inv.total === 'number' ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(inv.total) : inv.total}
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-sm">View →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {tasks.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tasks.map((t) => (
                      <li key={t.id}>
                        <Link
                          to={t.project_id ? `/projects/${t.project_id}` : '/projects'}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <SlotIcon slot="sidebar_projects" className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{t.title}</span>
                            {t.projects?.name && (
                              <span className="text-xs text-muted-foreground">{t.projects.name}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-sm">View →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {notes.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {notes.map((note) => (
                      <li key={note.id}>
                        <Link
                          to={`/notes?open=${note.id}`}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <SlotIcon slot="sidebar_notes" className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{note.title || 'Untitled'}</span>
                          </div>
                          <span className="text-muted-foreground text-sm">View →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
