import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { notifyStartGuideRefresh } from '@/components/layout/StartGuide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Plus, Search, MoreVertical, Trash2, Grid, List, PanelLeft, Download, Upload, GripVertical } from '@/components/icons';
import { downloadCsv, parseCsv, getClientsTemplateRows, CLIENTS_CSV_HEADERS } from '@/lib/csv';
import { SlotIcon } from '@/contexts/IconSlotContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PhoneInput } from '@/components/ui/phone-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Client {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  tax_id: string | null;
  street: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  avatar_color: string | null;
  status: string | null;
  notes: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
  lead_source: string | null;
  estimated_value: number | null;
  currency: string | null;
  tags: string[] | null;
  last_contacted_at: string | null;
  created_at: string;
  project_count?: number;
}

interface ClientActivity {
  id: string;
  client_id: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'other';
  body: string;
  occurred_at: string;
  created_at: string;
}

interface ClientFollowUp {
  id: string;
  client_id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  remind_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const AVATAR_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

const CRM_STAGES: Array<{ value: string; label: string }> = [
  { value: 'lead_new', label: 'New lead' },
  { value: 'lead_contacted', label: 'Contacted' },
  { value: 'lead_qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'closed_lost', label: 'Closed lost' },
];

function getClientInitials(client: Client) {
  return client.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getClientStatusColor(status: string) {
  switch (status) {
    case 'active':
    case 'won':
      return 'bg-success/10 text-success';
    case 'onboarding':
      return 'bg-primary/10 text-primary';
    case 'proposal_sent':
    case 'negotiation':
    case 'lead_new':
    case 'lead_contacted':
    case 'lead_qualified':
      return 'bg-warning/10 text-warning';
    case 'inactive':
    case 'closed_lost':
    case 'paused':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getClientStageLabel(value: string | null) {
  const v = value || 'active';
  return CRM_STAGES.find((s) => s.value === v)?.label || v;
}

function DraggableClientCard({
  client,
  onOpen,
  onEdit,
  onDelete,
  isOverlay = false,
}: {
  client: Client;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: client.id,
    data: { clientId: client.id, currentStatus: client.status || 'active' },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`border border-border/70 bg-background shadow-sm hover:shadow-md transition-all ${
        isDragging || isOverlay ? 'opacity-70 shadow-lg' : ''
      }`}
      onClick={onOpen}
    >
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="touch-none cursor-grab active:cursor-grabbing rounded-md p-1.5 hover:bg-muted/80 shrink-0"
              onClick={(e) => e.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
              style={{ backgroundColor: client.avatar_color || '#8B5CF6' }}
            >
              {getClientInitials(client)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate leading-tight">{client.name}</p>
              {client.company && <p className="text-xs text-muted-foreground truncate mt-0.5">{client.company}</p>}
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {client.email && (
            <p className="truncate flex items-center gap-1.5">
              <SlotIcon slot="client_email" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </p>
          )}
          {client.phone && (
            <p className="truncate flex items-center gap-1.5">
              <SlotIcon slot="client_phone" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.phone}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {client.next_follow_up_at && (
            <p className="truncate flex items-center gap-1.5">
              <SlotIcon slot="task_calendar" className="h-3.5 w-3.5 shrink-0" />
              <span>Follow-up {client.next_follow_up_at.slice(0, 10)}</span>
            </p>
          )}
          {client.next_action && (
            <p className="truncate" title={client.next_action}>
              Next: {client.next_action}
            </p>
          )}
        </div>

        <div className="pt-1 flex items-center justify-between border-t border-border/60">
          <Badge className={getClientStatusColor(client.status || 'active')}>
            {getClientStageLabel(client.status || 'active')}
          </Badge>
          <p className="text-xs text-muted-foreground">{client.project_count || 0} projects</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className + (isOver ? ' ring-2 ring-primary/50' : '')}>
      {children}
    </div>
  );
}

export default function Clients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [addWithStatus, setAddWithStatus] = useState<string | null>(null);
  const [clientPhone, setClientPhone] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[4]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'board'>('board');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [followUps, setFollowUps] = useState<ClientFollowUp[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [newFollowUpTitle, setNewFollowUpTitle] = useState('');
  const [newFollowUpDueAt, setNewFollowUpDueAt] = useState('');
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [editingFollowUpTitle, setEditingFollowUpTitle] = useState('');
  const [editingFollowUpDueAt, setEditingFollowUpDueAt] = useState('');
  const [newActivityType, setNewActivityType] = useState<ClientActivity['type']>('note');
  const [newActivityBody, setNewActivityBody] = useState('');
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [activeDragClient, setActiveDragClient] = useState<Client | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  useEffect(() => {
    if (!viewingClient?.id) return;
    fetchActivities(viewingClient.id);
    fetchFollowUps(viewingClient.id);
  }, [viewingClient?.id]);

  useEffect(() => {
    setClientPhone(editingClient?.phone || '');
    setSelectedColor(editingClient?.avatar_color || AVATAR_COLORS[4]);
  }, [editingClient]);

  // Sync view mode and status filter from URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/clients/active') {
      setViewMode('list');
      setStatusFilter('active');
    } else if (path === '/clients/list') {
      setViewMode('list');
      if (statusFilter === 'active') setStatusFilter('all');
    } else if (path === '/clients' || path.startsWith('/clients/')) {
      setViewMode('board');
      if (statusFilter === 'active') setStatusFilter('all');
    }
  }, [location.pathname]);

  // Open client sheet when ?open=<id> is in URL (e.g. from Dashboard follow-ups)
  useEffect(() => {
    const openId = new URLSearchParams(location.search).get('open');
    if (!openId || clients.length === 0) return;
    const c = clients.find((x) => x.id === openId);
    if (c) setViewingClient(c);
  }, [location.search, clients]);

  const setViewModeAndNavigate = (mode: 'grid' | 'list' | 'board', status?: string) => {
    setViewMode(mode);
    if (status !== undefined) setStatusFilter(status);
    if (mode === 'board') navigate('/clients');
    else if (mode === 'list' && status === 'active') navigate('/clients/active');
    else if (mode === 'list') navigate('/clients/list');
    else navigate('/clients');
  };

  const fetchClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch project counts
      const { data: projectCounts, error: projectError } = await supabase
        .from('projects')
        .select('client_id');

      if (!projectError && projectCounts) {
        const countMap = projectCounts.reduce((acc, p) => {
          if (p.client_id) {
            acc[p.client_id] = (acc[p.client_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const clientsWithCounts = (clientsData || []).map(c => ({
          ...c,
          project_count: countMap[c.id] || 0
        }));
        setClients(clientsWithCounts);
      } else {
        setClients(clientsData || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const fullName = `${firstName} ${lastName}`.trim();
    
    const tagsRaw = ((formData.get('tags') as string) || '').trim();
    const tags = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const estimatedValueRaw = (formData.get('estimated_value') as string) || '';
    const estimatedValue = estimatedValueRaw.trim() ? Number(estimatedValueRaw) : null;

    const followUpRaw = (formData.get('next_follow_up_at') as string) || '';
    const nextFollowUpAt = followUpRaw ? new Date(followUpRaw).toISOString() : null;

    const clientData = {
      name: fullName,
      first_name: firstName || null,
      last_name: lastName || null,
      email: formData.get('email') as string || null,
      phone: clientPhone || null,
      company: formData.get('company') as string || null,
      tax_id: formData.get('tax_id') as string || null,
      street: formData.get('street') as string || null,
      street2: formData.get('street2') as string || null,
      city: formData.get('city') as string || null,
      state: formData.get('state') as string || null,
      postal_code: formData.get('postal_code') as string || null,
      country: formData.get('country') as string || null,
      avatar_color: selectedColor,
      status: formData.get('status') as string,
      notes: formData.get('notes') as string || null,
      lead_source: (formData.get('lead_source') as string) || null,
      next_action: (formData.get('next_action') as string) || null,
      next_follow_up_at: nextFollowUpAt,
      estimated_value: estimatedValue,
      currency: ((formData.get('currency') as string) || 'USD') || 'USD',
      tags,
      user_id: user!.id,
    };

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);
        if (error) throw error;
        toast({ title: 'Client updated successfully' });
        notifyStartGuideRefresh();
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);
        if (error) throw error;
        toast({ title: 'Client created successfully' });
        notifyStartGuideRefresh();
      }
      
      setIsDialogOpen(false);
      setEditingClient(null);
      setClientPhone('');
      setSelectedColor(AVATAR_COLORS[4]);
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'Error saving client',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Client deleted successfully' });
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'Error deleting client',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(
    (client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchQuery.toLowerCase());
      const stage = client.status || 'active';
      const matchesStatus = statusFilter === 'all' || stage === statusFilter;
      return matchesSearch && matchesStatus;
    }
  );

  // Sort by pipeline stage order so list/grid/board show clients grouped by status
  const stageOrder = CRM_STAGES.map((s) => s.value);
  const sortedClients = [...filteredClients].sort((a, b) => {
    const aStage = a.status || 'active';
    const bStage = b.status || 'active';
    return stageOrder.indexOf(aStage) - stageOrder.indexOf(bStage);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'won':
        return 'bg-success/10 text-success';
      case 'onboarding':
        return 'bg-primary/10 text-primary';
      case 'proposal_sent':
      case 'negotiation':
        return 'bg-warning/10 text-warning';
      case 'lead_new':
      case 'lead_contacted':
      case 'lead_qualified':
        return 'bg-warning/10 text-warning';
      case 'inactive':
      case 'closed_lost':
        return 'bg-muted text-muted-foreground';
      case 'paused':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStageLabel = (value: string | null) => {
    const v = value || 'active';
    return CRM_STAGES.find((s) => s.value === v)?.label || v;
  };

  const getStatusBorderClass = (status: string | null) => {
    const s = status || 'active';
    if (['active', 'won'].includes(s)) return 'border-l-success';
    if (['lead_new', 'lead_contacted', 'lead_qualified', 'proposal_sent', 'negotiation', 'onboarding'].includes(s)) return 'border-l-warning';
    return 'border-l-muted-foreground/50';
  };

  const getStageHeaderClass = (status: string) => {
    if (['active', 'won'].includes(status)) return 'bg-success/15 text-success';
    if (['lead_new', 'lead_contacted', 'lead_qualified', 'proposal_sent', 'negotiation', 'onboarding'].includes(status)) {
      return 'bg-warning/15 text-warning';
    }
    return 'bg-muted text-muted-foreground';
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const handleDragStart = (event: DragStartEvent) => {
    const clientId = event.active.id as string;
    const dragged = clients.find((c) => c.id === clientId) || null;
    setActiveDragClient(dragged);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragClient(null);
    const { active, over } = event;
    if (!over || over.id === active.id) return;
    const clientId = active.data.current?.clientId as string | undefined;
    const currentStatus = (active.data.current?.currentStatus as string) || 'active';
    // over.id can be a column (stage value) or another card (client id) when dropped on a card
    let newStatus = String(over.id);
    if (!CRM_STAGES.some((s) => s.value === newStatus)) {
      const targetClient = clients.find((c) => c.id === newStatus);
      newStatus = targetClient?.status || 'active';
    }
    if (!clientId || !CRM_STAGES.some((s) => s.value === newStatus) || currentStatus === newStatus) return;
    try {
      const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', clientId);
      if (error) throw error;
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
      toast({ title: 'Status updated' });
    } catch (err: any) {
      toast({ title: 'Error updating status', description: err.message, variant: 'destructive' });
    }
  };

  const downloadTemplate = () => {
    const rows = getClientsTemplateRows();
    downloadCsv('clients_template.csv', rows);
    toast({ title: 'Template downloaded' });
  };

  const exportClientsCsv = () => {
    const headers = CLIENTS_CSV_HEADERS;
    const rows = [
      headers,
      ...sortedClients.map((c) => [
        c.first_name ?? '',
        c.last_name ?? '',
        c.email ?? '',
        c.phone ?? '',
        c.company ?? '',
        c.status ?? '',
        c.next_action ?? '',
        c.next_follow_up_at ? c.next_follow_up_at.slice(0, 10) : '',
        c.lead_source ?? '',
        c.estimated_value ?? '',
        c.currency ?? '',
        (c.tags || []).join('; '),
        c.notes ?? '',
        c.street ?? '',
        c.street2 ?? '',
        c.city ?? '',
        c.state ?? '',
        c.postal_code ?? '',
        c.country ?? '',
        c.tax_id ?? '',
      ]),
    ];
    downloadCsv('clients_export.csv', rows);
    toast({ title: 'Clients exported' });
  };

  const handleCsvImport = async (file: File) => {
    if (!user) return;
    setImporting(true);
    try {
      const rows = await parseCsv(file);
      if (rows.length < 2) {
        toast({ title: 'No data rows', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' });
        return;
      }
      const headerRow = rows[0].map((h) => String(h).trim().toLowerCase());
      const get = (key: string) => {
        const i = headerRow.indexOf(key.toLowerCase());
        return i >= 0 ? (row: string[]) => (row[i] ?? '').trim() : () => '';
      };
      let created = 0;
      let updated = 0;
      let errors: string[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const firstName = get('first_name')(row);
        const lastName = get('last_name')(row);
        const name = `${firstName} ${lastName}`.trim() || (get('email')(row) || 'Unknown');
        const email = get('email')(row);
        if (!email) {
          errors.push(`Row ${r + 1}: email required`);
          continue;
        }
        const tagsRaw = get('tags')(row);
        const tags = tagsRaw ? tagsRaw.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : [];
        const estimatedVal = get('estimated_value')(row);
        const estimatedValue = estimatedVal ? Number(estimatedVal) : null;
        const nextFollowUp = get('next_follow_up_at')(row);
        const nextFollowUpAt = nextFollowUp ? new Date(nextFollowUp).toISOString() : null;
        const rawStatus = get('status')(row) || 'active';
        const normalizedStatus = (() => {
          const lower = rawStatus.toLowerCase();
          const byValue = CRM_STAGES.find((s) => s.value === lower);
          if (byValue) return byValue.value;
          const byLabel = CRM_STAGES.find((s) => s.label.toLowerCase() === lower);
          if (byLabel) return byLabel.value;
          if (/^proposal/i.test(rawStatus)) return 'proposal_sent';
          if (/^in\s*progress$/i.test(rawStatus)) return 'onboarding';
          if (/^closed\s*lost$/i.test(rawStatus)) return 'closed_lost';
          if (/^lead\s*new$/i.test(rawStatus)) return 'lead_new';
          if (/^lead\s*contacted$/i.test(rawStatus)) return 'lead_contacted';
          if (/^lead\s*qualified$/i.test(rawStatus)) return 'lead_qualified';
          return 'active';
        })();
        const clientData = {
          name,
          first_name: firstName || null,
          last_name: lastName || null,
          email,
          phone: get('phone')(row) || null,
          company: get('company')(row) || null,
          tax_id: get('tax_id')(row) || null,
          street: get('street')(row) || null,
          street2: get('street2')(row) || null,
          city: get('city')(row) || null,
          state: get('state')(row) || null,
          postal_code: get('postal_code')(row) || null,
          country: get('country')(row) || null,
          avatar_color: AVATAR_COLORS[4],
          status: normalizedStatus,
          notes: get('notes')(row) || null,
          next_action: get('next_action')(row) || null,
          next_follow_up_at: nextFollowUpAt,
          lead_source: get('lead_source')(row) || null,
          estimated_value: estimatedValue,
          currency: get('currency')(row) || 'USD',
          tags,
          user_id: user.id,
        };
        const existing = clients.find((c) => c.email?.toLowerCase() === email.toLowerCase());
        if (existing) {
          const { error } = await supabase.from('clients').update(clientData).eq('id', existing.id);
          if (error) errors.push(`Row ${r + 1}: ${error.message}`);
          else updated++;
        } else {
          const { error } = await supabase.from('clients').insert(clientData);
          if (error) errors.push(`Row ${r + 1}: ${error.message}`);
          else created++;
        }
      }
      if (created > 0 || updated > 0) {
        fetchClients();
        toast({ title: 'Import complete', description: `Created ${created}, updated ${updated}.${errors.length ? ` ${errors.length} errors.` : ''}` });
      }
      if (errors.length > 0 && created === 0 && updated === 0) {
        toast({ title: 'Import failed', description: errors.slice(0, 3).join(' '), variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Import error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const fetchActivities = async (clientId: string) => {
    setActivitiesLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_activities')
        .select('id, client_id, type, body, occurred_at, created_at')
        .eq('client_id', clientId)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      setActivities((data as ClientActivity[]) || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchFollowUps = async (clientId: string) => {
    setFollowUpsLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_follow_ups')
        .select('id, client_id, title, details, due_at, remind_at, completed_at, created_at')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: true, nullsFirst: true })
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFollowUps((data as ClientFollowUp[]) || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  const addFollowUp = async () => {
    if (!user || !viewingClient) return;
    const title = newFollowUpTitle.trim();
    if (!title) return;
    const dueAt = newFollowUpDueAt ? new Date(newFollowUpDueAt).toISOString() : null;
    try {
      const { error } = await supabase.from('client_follow_ups').insert({
        user_id: user.id,
        client_id: viewingClient.id,
        title,
        due_at: dueAt,
        remind_at: dueAt,
      });
      if (error) throw error;
      setNewFollowUpTitle('');
      setNewFollowUpDueAt('');
      await fetchFollowUps(viewingClient.id);
      toast({ title: 'Follow-up added' });
    } catch (error: any) {
      toast({
        title: 'Error adding follow-up',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const setFollowUpCompleted = async (followUp: ClientFollowUp, done: boolean) => {
    if (!viewingClient) return;
    try {
      const { error } = await supabase
        .from('client_follow_ups')
        .update({ completed_at: done ? new Date().toISOString() : null })
        .eq('id', followUp.id);
      if (error) throw error;
      await fetchFollowUps(viewingClient.id);
      toast({ title: done ? 'Follow-up completed' : 'Follow-up reopened' });
    } catch (error: any) {
      toast({
        title: 'Error updating follow-up',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const startEditingFollowUp = (followUp: ClientFollowUp) => {
    setEditingFollowUpId(followUp.id);
    setEditingFollowUpTitle(followUp.title);
    setEditingFollowUpDueAt(followUp.due_at ? followUp.due_at.slice(0, 10) : '');
  };

  const cancelEditingFollowUp = () => {
    setEditingFollowUpId(null);
    setEditingFollowUpTitle('');
    setEditingFollowUpDueAt('');
  };

  const saveFollowUpEdit = async () => {
    if (!viewingClient || !editingFollowUpId) return;
    const title = editingFollowUpTitle.trim();
    if (!title) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    const dueAt = editingFollowUpDueAt ? new Date(editingFollowUpDueAt).toISOString() : null;
    try {
      const { error } = await supabase
        .from('client_follow_ups')
        .update({
          title,
          due_at: dueAt,
          remind_at: dueAt,
        })
        .eq('id', editingFollowUpId);
      if (error) throw error;
      cancelEditingFollowUp();
      await fetchFollowUps(viewingClient.id);
      toast({ title: 'Follow-up updated' });
    } catch (error: any) {
      toast({
        title: 'Error updating follow-up',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteFollowUp = async (followUpId: string) => {
    if (!viewingClient) return;
    try {
      const { error } = await supabase
        .from('client_follow_ups')
        .delete()
        .eq('id', followUpId);
      if (error) throw error;
      await fetchFollowUps(viewingClient.id);
      toast({ title: 'Follow-up deleted' });
    } catch (error: any) {
      toast({
        title: 'Error deleting follow-up',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addActivity = async () => {
    if (!user || !viewingClient) return;
    const body = newActivityBody.trim();
    if (!body) return;
    try {
      const { error } = await supabase.from('client_activities').insert({
        user_id: user.id,
        client_id: viewingClient.id,
        type: newActivityType,
        body,
        occurred_at: new Date().toISOString(),
      });
      if (error) throw error;
      setNewActivityBody('');
      await fetchActivities(viewingClient.id);
      toast({ title: 'Activity added' });
    } catch (error: any) {
      toast({
        title: 'Error adding activity',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!viewingClient) return;
    try {
      const { error } = await supabase
        .from('client_activities')
        .delete()
        .eq('id', activityId);
      if (error) throw error;
      await fetchActivities(viewingClient.id);
      toast({ title: 'Activity deleted' });
    } catch (error: any) {
      toast({
        title: 'Error deleting activity',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getInitials = (client: Client) => {
    if (client.first_name && client.last_name) {
      return `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
    }
    return client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client relationships
            </p>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setImportDialogOpen(false);
                handleCsvImport(f);
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="Template, export, or import CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportClientsCsv} disabled={sortedClients.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)} disabled={importing}>
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing…' : 'Import'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Import clients from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Download the <strong className="text-foreground">Template</strong> to get the correct column headers.</p>
                  <p>2. Fill in your client data. <strong className="text-foreground">Email</strong> is required. Rows with an existing email will update that client.</p>
                  <p>3. In the <strong className="text-foreground">status</strong> column, use one of these values (labels like &quot;Active&quot; or &quot;Proposal sent&quot; also work):</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                    {CRM_STAGES.map((s) => (
                      <li key={s.value}><code className="text-xs bg-muted px-1 rounded">{s.value}</code> — {s.label}</li>
                    ))}
                  </ul>
                  <p>4. Save as CSV and choose your file below.</p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" size="sm" onClick={() => { downloadTemplate(); setImportDialogOpen(false); }}>
                    <Download className="mr-2 h-4 w-4" />
                    Template
                  </Button>
                  <Button size="sm" onClick={() => csvInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose CSV file
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingClient(null);
                setAddWithStatus(null);
                setClientPhone('');
                setSelectedColor(AVATAR_COLORS[4]);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw]">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-120px)]">
                <form onSubmit={handleSubmit} className="space-y-4 py-1 pr-6 pl-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        defaultValue={editingClient?.first_name || editingClient?.name.split(' ')[0] || ''}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        defaultValue={editingClient?.last_name || editingClient?.name.split(' ').slice(1).join(' ') || ''}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editingClient?.email || ''}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        name="company"
                        defaultValue={editingClient?.company || ''}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <PhoneInput
                      id="phone"
                      value={clientPhone}
                      onChange={setClientPhone}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax Identification Number</Label>
                    <Input
                      id="tax_id"
                      name="tax_id"
                      defaultValue={editingClient?.tax_id || ''}
                      placeholder="Tax ID / VAT number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      name="street"
                      defaultValue={editingClient?.street || ''}
                      placeholder="Street"
                    />
                  </div>
                  <Input
                    name="street2"
                    defaultValue={editingClient?.street2 || ''}
                    placeholder="Street 2"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="city"
                      defaultValue={editingClient?.city || ''}
                      placeholder="City"
                    />
                    <Input
                      name="state"
                      defaultValue={editingClient?.state || ''}
                      placeholder="State/Province"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="postal_code"
                      defaultValue={editingClient?.postal_code || ''}
                      placeholder="ZIP/Postal Code"
                    />
                    <Input
                      name="country"
                      defaultValue={editingClient?.country || ''}
                      placeholder="Country"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingClient?.status || addWithStatus || 'active'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CRM_STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="next_follow_up_at">Next follow-up</Label>
                      <Input
                        id="next_follow_up_at"
                        name="next_follow_up_at"
                        type="date"
                        defaultValue={editingClient?.next_follow_up_at ? editingClient.next_follow_up_at.slice(0, 10) : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead_source">Lead source</Label>
                      <Input
                        id="lead_source"
                        name="lead_source"
                        placeholder="e.g. Referral, Website, Upwork"
                        defaultValue={editingClient?.lead_source || ''}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="next_action">Next action</Label>
                    <Input
                      id="next_action"
                      name="next_action"
                      placeholder="e.g. Send proposal, Follow up on invoice"
                      defaultValue={editingClient?.next_action || ''}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimated_value">Estimated value</Label>
                      <Input
                        id="estimated_value"
                        name="estimated_value"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        defaultValue={editingClient?.estimated_value ?? ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        name="currency"
                        placeholder="USD"
                        defaultValue={editingClient?.currency || 'USD'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      name="tags"
                      placeholder="e.g. retainer, agency, warm"
                      defaultValue={(editingClient?.tags || []).join(', ')}
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Avatar Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full transition-all ${
                            selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingClient?.notes || ''}
                      rows={3}
                      placeholder="Internal notes about this client..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingClient ? 'Update' : 'Add'} Client
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search, Status Filter & View Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {CRM_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewModeAndNavigate('board')}
                className="rounded-none"
                title="Board by status"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewModeAndNavigate('grid')}
                className="rounded-none"
                title="Grid"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewModeAndNavigate('list', statusFilter === 'active' ? 'active' : undefined)}
                className="rounded-none"
                title="List"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Clients Grid/List */}
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
        ) : filteredClients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adding your first client
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'board' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={(args) => {
                  const pointer = pointerWithin(args);
                  return pointer.length > 0 ? pointer : closestCenter(args);
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveDragClient(null)}
              >
                <div className="overflow-x-auto pb-4 -mx-1">
                  <div className="flex gap-4 min-w-max px-1">
                    {CRM_STAGES.map((stage) => {
                      const columnClients = sortedClients.filter((c) => (c.status || 'active') === stage.value);
                      return (
                        <div
                          key={stage.value}
                          className="flex flex-col w-[320px] shrink-0"
                        >
                          <div className={`rounded-t-xl px-4 py-3 border border-b-0 ${getStageHeaderClass(stage.value)}`}>
                            <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">{stage.label}</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {columnClients.length}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                title="Add client"
                                onClick={() => {
                                  setAddWithStatus(stage.value);
                                  setEditingClient(null);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            </div>
                          </div>
                          <DroppableColumn
                            id={stage.value}
                            className="p-3 flex flex-col gap-3 overflow-y-auto max-h-[60vh] bg-card/80 backdrop-blur-[1px] border border-t-0 rounded-b-xl min-h-[420px] transition-colors"
                          >
                            <SortableContext items={columnClients.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                              {columnClients.map((client) => (
                                <DraggableClientCard
                                  key={client.id}
                                  client={client}
                                  onOpen={() => setViewingClient(client)}
                                  onEdit={() => openEditDialog(client)}
                                  onDelete={() => handleDelete(client.id)}
                                />
                              ))}
                            </SortableContext>
                            {columnClients.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground text-sm">No clients</div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-muted-foreground hover:text-primary-foreground border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10"
                              onClick={() => {
                                setAddWithStatus(stage.value);
                                setEditingClient(null);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add client
                            </Button>
                          </DroppableColumn>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <DragOverlay>
                  {activeDragClient ? (
                    <div className="w-[300px]">
                      <DraggableClientCard
                        client={activeDragClient}
                        onOpen={() => {}}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        isOverlay
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
            <div className={viewMode === 'grid' ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
              {sortedClients.map((client) => (
                <Card
                  key={client.id}
                  className={`${viewMode === 'list' ? 'border-l-4 ' + getStatusBorderClass(client.status) : 'border-0'} shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={() => (viewMode === 'grid' || viewMode === 'list') && setViewingClient(client)}
                >
                  <CardContent className={viewMode === 'grid' ? "p-5 relative" : "p-4 flex items-center justify-between"}>
                    {viewMode === 'grid' && (
                      <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(client)}>
                              <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    <div className={viewMode === 'grid' ? "space-y-3" : "flex items-center gap-4"}>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
                          style={{ backgroundColor: client.avatar_color || '#8B5CF6' }}
                        >
                          {getInitials(client)}
                        </div>
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          {client.company && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <SlotIcon slot="client_company" className="h-3 w-3" />
                              {client.company}
                            </p>
                          )}
                        </div>
                      </div>
                      {viewMode === 'grid' && (
                        <>
                          {client.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <SlotIcon slot="client_email" className="h-4 w-4" />
                              <a href={`mailto:${client.email}`} className="hover:text-primary truncate" onClick={(e) => e.stopPropagation()}>
                                {client.email}
                              </a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <SlotIcon slot="client_phone" className="h-4 w-4" />
                              <a href={`tel:${client.phone}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                {client.phone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <Badge className={getStatusColor(client.status || 'active')}>
                              {getStageLabel(client.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {client.project_count || 0} projects
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground hidden md:block">
                          {client.email}
                        </span>
                        <Badge className={getStatusColor(client.status)}>
                          {getStageLabel(client.status)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(client)}>
                              <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            )}

            <Sheet open={!!viewingClient} onOpenChange={(open) => !open && setViewingClient(null)}>
              <SheetContent className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Client details</SheetTitle>
                </SheetHeader>
                {viewingClient && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: viewingClient.avatar_color || '#8B5CF6' }}
                      >
                        {getInitials(viewingClient)}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{viewingClient.name}</p>
                        {viewingClient.company && (
                          <p className="text-sm text-muted-foreground">{viewingClient.company}</p>
                        )}
                        <Badge className={getStatusColor(viewingClient.status || 'active')}>
                          {getStageLabel(viewingClient.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Next follow-up</p>
                        <p className="text-sm">
                          {viewingClient.next_follow_up_at
                            ? viewingClient.next_follow_up_at.slice(0, 10)
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lead source</p>
                        <p className="text-sm">{viewingClient.lead_source || '—'}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm font-semibold mb-2">Follow-up tasks</p>
                      <div className="space-y-2">
                        <Input
                          value={newFollowUpTitle}
                          onChange={(e) => setNewFollowUpTitle(e.target.value)}
                          placeholder="New follow-up action"
                        />
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Due date</Label>
                          <Input
                            type="date"
                            value={newFollowUpDueAt}
                            onChange={(e) => setNewFollowUpDueAt(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={addFollowUp} disabled={!newFollowUpTitle.trim()}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add follow-up
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {followUpsLoading ? (
                          <p className="text-xs text-muted-foreground">Loading follow-ups…</p>
                        ) : followUps.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No follow-up tasks yet.</p>
                        ) : (
                          followUps.map((f) => (
                            <div key={f.id} className="rounded-md border p-2">
                              {editingFollowUpId === f.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingFollowUpTitle}
                                    onChange={(e) => setEditingFollowUpTitle(e.target.value)}
                                    placeholder="Follow-up title"
                                  />
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Due date</Label>
                                    <Input
                                      type="date"
                                      value={editingFollowUpDueAt}
                                      onChange={(e) => setEditingFollowUpDueAt(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={cancelEditingFollowUp}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={saveFollowUpEdit}>
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className={`text-sm ${f.completed_at ? 'line-through text-muted-foreground' : ''}`}>{f.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {f.due_at ? `Due ${f.due_at.slice(0, 10)}` : 'No due date'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => startEditingFollowUp(f)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => setFollowUpCompleted(f, !f.completed_at)}
                                    >
                                      {f.completed_at ? 'Reopen' : 'Done'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => deleteFollowUp(f.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(viewingClient.tags || []).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm font-semibold mb-2">Activity</p>
                      <div className="flex items-start gap-2">
                        <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as ClientActivity['type'])}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={newActivityBody}
                            onChange={(e) => setNewActivityBody(e.target.value)}
                            rows={2}
                            placeholder="Add an activity note…"
                          />
                          <div className="flex justify-end">
                            <Button size="sm" onClick={addActivity} disabled={!newActivityBody.trim()}>
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {activitiesLoading ? (
                          <p className="text-sm text-muted-foreground">Loading activity…</p>
                        ) : activities.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No activity yet.</p>
                        ) : (
                          activities.map((a) => (
                            <div key={a.id} className="rounded-lg border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">
                                    {a.type} • {a.occurred_at.slice(0, 10)}
                                  </p>
                                  <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => deleteActivity(a.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {viewingClient.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a href={`mailto:${viewingClient.email}`} className="text-primary hover:underline">
                          {viewingClient.email}
                        </a>
                      </div>
                    )}
                    {viewingClient.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <a href={`tel:${viewingClient.phone}`} className="text-primary hover:underline">
                          {viewingClient.phone}
                        </a>
                      </div>
                    )}
                    {(viewingClient.street || viewingClient.city) && (
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="text-sm">
                          {[viewingClient.street, viewingClient.street2, viewingClient.city, viewingClient.state, viewingClient.postal_code, viewingClient.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {viewingClient.project_count || 0} projects
                    </p>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={() => { openEditDialog(viewingClient); setViewingClient(null); }}>
                        <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => setViewingClient(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </AppLayout>
  );
}
