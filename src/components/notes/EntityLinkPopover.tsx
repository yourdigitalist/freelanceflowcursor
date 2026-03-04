import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type EntityType = 'client' | 'project' | 'task';

export interface EntityOption {
  type: EntityType;
  id: string;
  label: string;
  href: string;
  subtitle?: string;
}

interface EntityLinkPopoverProps {
  onSelect: (entity: EntityOption) => void;
  trigger: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function EntityLinkPopover({
  onSelect,
  trigger,
  side = 'bottom',
  align = 'start',
}: EntityLinkPopoverProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EntityType>('client');
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; icon_emoji?: string | null }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string; project_id: string | null; projects?: { name: string } | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setQuery('');
    loadClients();
    loadProjects();
    loadTasks();
  }, [open, user]);

  const loadClients = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name')
      .limit(100);
    setClients((data as { id: string; name: string }[]) || []);
    setLoading(false);
  };

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('projects')
      .select('id, name, icon_emoji')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100);
    setProjects((data as { id: string; name: string; icon_emoji?: string | null }[]) || []);
  };

  const loadTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, title, project_id, projects(name)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(150);
    setTasks((data as { id: string; title: string; project_id: string | null; projects?: { name: string } | null }[]) || []);
  };

  const filter = (list: { label: string; [k: string]: unknown }[], getLabel: (x: unknown) => string) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((x) => getLabel(x).toLowerCase().includes(q));
  };

  const filteredClients = filter(
    clients.map((c) => ({ ...c, label: c.name })),
    (x) => (x as { label: string }).label
  );
  const filteredProjects = filter(
    projects.map((p) => ({ ...p, label: p.name })),
    (x) => (x as { label: string }).label
  );
  const filteredTasks = filter(
    tasks.map((t) => ({
      ...t,
      label: t.title,
      subtitle: (t.projects as { name: string } | null)?.name,
    })),
    (x) => (x as { label: string }).label
  );

  const pickClient = (c: { id: string; name: string }) => {
    onSelect({ type: 'client', id: c.id, label: c.name, href: `/clients?open=${c.id}` });
    setOpen(false);
  };
  const pickProject = (p: { id: string; name: string; icon_emoji?: string | null }) => {
    onSelect({ type: 'project', id: p.id, label: p.name, href: `/projects/${p.id}` });
    setOpen(false);
  };
  const pickTask = (t: { id: string; title: string; project_id: string | null; projects?: { name: string } | null }) => {
    const projectName = (t.projects as { name: string } | null)?.name;
    onSelect({
      type: 'task',
      id: t.id,
      label: t.title,
      href: `/projects/${t.project_id}?task=${t.id}`,
      subtitle: projectName ?? undefined,
    });
    setOpen(false);
  };

  const pickerContent = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as EntityType)} className="w-full">
      <TabsList className="w-full grid grid-cols-3 rounded-none border-b rounded-t-lg">
        <TabsTrigger value="client" className="rounded-none">Clients</TabsTrigger>
        <TabsTrigger value="project" className="rounded-none">Projects</TabsTrigger>
        <TabsTrigger value="task" className="rounded-none">Tasks</TabsTrigger>
      </TabsList>
      <div className="p-2 border-b">
        <Input
          placeholder={`Search ${tab}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9"
        />
      </div>
      <ScrollArea className="h-[240px]">
        <TabsContent value="client" className="mt-0 p-1">
          {loading ? (
            <p className="text-sm text-muted-foreground p-2">Loading...</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No clients match</p>
          ) : (
            filteredClients.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center gap-2"
                )}
                onClick={() => pickClient(c)}
              >
                <span className="truncate">{c.name}</span>
              </button>
            ))
          )}
        </TabsContent>
        <TabsContent value="project" className="mt-0 p-1">
          {filteredProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No projects match</p>
          ) : (
            filteredProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => pickProject(p)}
              >
                <span>{p.icon_emoji || '📁'}</span>
                <span className="truncate">{p.name}</span>
              </button>
            ))
          )}
        </TabsContent>
        <TabsContent value="task" className="mt-0 p-1">
          {filteredTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No tasks match</p>
          ) : (
            filteredTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex flex-col gap-0.5"
                onClick={() => pickTask(t)}
              >
                <span className="truncate font-medium">{t.title}</span>
                {(t.projects as { name: string } | null)?.name && (
                  <span className="text-xs text-muted-foreground truncate">
                    {(t.projects as { name: string }).name}
                  </span>
                )}
              </button>
            ))
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align={align} side={side}>
        {pickerContent}
      </PopoverContent>
    </Popover>
  );
}

/** Standalone picker content (e.g. for @ mention popover). Loads data when mounted. */
export function EntityLinkPickerContent({
  onSelect,
  onClose,
}: {
  onSelect: (entity: EntityOption) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<EntityType>('client');
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; icon_emoji?: string | null }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string; project_id: string | null; projects?: { name: string } | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from('clients').select('id, name').eq('user_id', user.id).order('name').limit(100),
      supabase.from('projects').select('id, name, icon_emoji').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100),
      supabase.from('tasks').select('id, title, project_id, projects(name)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(150),
    ]).then(([c, p, t]) => {
      setClients((c.data as { id: string; name: string }[]) || []);
      setProjects((p.data as { id: string; name: string; icon_emoji?: string | null }[]) || []);
      setTasks((t.data as { id: string; title: string; project_id: string | null; projects?: { name: string } | null }[]) || []);
      setLoading(false);
    });
  }, [user]);

  const filter = (list: { label: string }[], getLabel: (x: { label: string }) => string) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((x) => getLabel(x).toLowerCase().includes(q));
  };
  const filteredClients = filter(clients.map((c) => ({ ...c, label: c.name })), (x) => x.label);
  const filteredProjects = filter(projects.map((p) => ({ ...p, label: p.name })), (x) => x.label);
  const filteredTasks = filter(
    tasks.map((t) => ({ ...t, label: t.title })),
    (x) => x.label
  );

  const pick = (entity: EntityOption) => {
    onSelect(entity);
    onClose();
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as EntityType)} className="w-full">
      <TabsList className="w-full grid grid-cols-3 rounded-none border-b rounded-t-lg">
        <TabsTrigger value="client" className="rounded-none">Clients</TabsTrigger>
        <TabsTrigger value="project" className="rounded-none">Projects</TabsTrigger>
        <TabsTrigger value="task" className="rounded-none">Tasks</TabsTrigger>
      </TabsList>
      <div className="p-2 border-b">
        <Input placeholder={`Search ${tab}...`} value={query} onChange={(e) => setQuery(e.target.value)} className="h-9" />
      </div>
      <ScrollArea className="h-[240px]">
        <TabsContent value="client" className="mt-0 p-1">
          {loading ? <p className="text-sm text-muted-foreground p-2">Loading...</p> : filteredClients.length === 0 ? <p className="text-sm text-muted-foreground p-2">No clients match</p> : filteredClients.map((c) => (
            <button key={c.id} type="button" className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center gap-2" onClick={() => pick({ type: 'client', id: c.id, label: c.name, href: `/clients?open=${c.id}` })}><span className="truncate">{c.name}</span></button>
          ))}
        </TabsContent>
        <TabsContent value="project" className="mt-0 p-1">
          {filteredProjects.length === 0 ? <p className="text-sm text-muted-foreground p-2">No projects match</p> : filteredProjects.map((p) => (
            <button key={p.id} type="button" className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center gap-2" onClick={() => pick({ type: 'project', id: p.id, label: p.name, href: `/projects/${p.id}` })}><span>{p.icon_emoji || '📁'}</span><span className="truncate">{p.name}</span></button>
          ))}
        </TabsContent>
        <TabsContent value="task" className="mt-0 p-1">
          {filteredTasks.length === 0 ? <p className="text-sm text-muted-foreground p-2">No tasks match</p> : filteredTasks.map((t) => (
            <button key={t.id} type="button" className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex flex-col gap-0.5" onClick={() => pick({ type: 'task', id: t.id, label: t.title, href: `/projects/${t.project_id}?task=${t.id}` })}><span className="truncate font-medium">{t.title}</span>{(t.projects as { name: string } | null)?.name && <span className="text-xs text-muted-foreground truncate">{(t.projects as { name: string }).name}</span>}</button>
          ))}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}
