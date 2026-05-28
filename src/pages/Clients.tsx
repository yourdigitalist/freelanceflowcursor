import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  archiveClient,
  buildArchiveConfirmMessage,
  buildBlockedDeleteMessage,
  buildDeleteConfirmMessage,
  buildRestoreConfirmMessage,
  canHardDeleteClient,
  deleteClient,
  formatClientDeleteError,
  getClientRelatedCounts,
  hasClientRelatedRecords,
  isClientArchived,
  restoreClient,
} from '@/lib/clientLifecycle';
import { Checkbox } from '@/components/ui/checkbox';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ViewToggle, ViewToggleButton } from '@/components/ui/view-toggle';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, MoreVertical, Trash2, Grid, List, PanelLeft, Download, Upload, GripVertical, Filter } from '@/components/icons';
import { downloadCsv, parseCsv, getClientsTemplateRows, CLIENTS_CSV_HEADERS } from '@/lib/csv';
import { SlotIcon } from '@/contexts/IconSlotContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientAvatar } from '@/components/clients/ClientAvatar';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { DEFAULT_CLIENT_AVATAR_COLOR } from '@/lib/clientAvatarColors';
import { CLIENT_CRM_STAGES, getClientStageLabel } from '@/lib/clientCrmStages';
import { buildClientsNavState, readClientsNavState } from '@/lib/clientsNavigation';
import { HorizontalScroll } from '@/components/ui/horizontal-scroll';
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
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { formatLocaleDate, formatLocaleDateTime } from '@/lib/datetime';

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
  logo_url: string | null;
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
  archived_at: string | null;
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

function DraggableClientCard({
  client,
  onOpen,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  formatDate,
  isOverlay = false,
}: {
  client: Client;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  formatDate: (value: string | null | undefined) => string;
  isOverlay?: boolean;
}) {
  const archived = isClientArchived(client);
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
            <ClientAvatar client={client} size="sm" />
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
                {archived ? (
                  <DropdownMenuItem onClick={onRestore}>Restore client</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onArchive}>Archive client</DropdownMenuItem>
                )}
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
              <span>Follow-up {formatDate(client.next_follow_up_at)}</span>
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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'board'>('board');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
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
  const { dateFormat, timeFormat } = useLocalePreferences();

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

  // Sync view mode and status filter from URL (and grid/board when returning from client detail)
  useEffect(() => {
    const path = location.pathname;
    const viewParam = new URLSearchParams(location.search).get('view');
    const navState = readClientsNavState(location.state);
    if (path === '/clients/active') {
      setViewMode('list');
      setStatusFilter('active');
    } else if (path === '/clients/list') {
      const nextView = viewParam === 'grid' ? 'grid' : (navState?.clientsViewMode === 'grid' ? 'grid' : 'list');
      setViewMode(nextView);
      if (statusFilter === 'active') setStatusFilter('all');
    } else if (path === '/clients') {
      if (viewParam === 'grid') setViewMode('grid');
      else if (viewParam === 'list') setViewMode('list');
      else setViewMode(navState?.clientsViewMode ?? 'board');
      if (statusFilter === 'active') setStatusFilter('all');
    }
  }, [location.pathname, location.search, location.state]);

  const openClientDetail = (clientId: string) => {
    navigate(`/clients/${clientId}`, {
      state: buildClientsNavState(location.pathname, viewMode),
    });
  };

  // Open the canonical create dialog when linked from quick actions.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') !== '1') return;
    setEditingClient(null);
    setAddWithStatus(null);
    setIsDialogOpen(true);
    navigate(location.pathname, { replace: true });
  }, [location.search, location.pathname, navigate]);

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
    else if (mode === 'grid') navigate('/clients/list?view=grid');
    else if (mode === 'list' && status === 'active') navigate('/clients/active');
    else if (mode === 'list') navigate('/clients/list');
    else navigate('/clients');
  };

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (showArchived ? 1 : 0);

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

  const handleArchive = async (id: string) => {
    const target = clients.find((c) => c.id === id);
    if (!target || !confirm(buildArchiveConfirmMessage(target.name))) return;
    try {
      const { error } = await archiveClient(id);
      if (error) throw error;
      toast({ title: 'Client archived' });
      fetchClients();
    } catch (error: any) {
      toast({ title: 'Could not archive client', description: error.message, variant: 'destructive' });
    }
  };

  const handleRestore = async (id: string) => {
    const target = clients.find((c) => c.id === id);
    if (!target || !confirm(buildRestoreConfirmMessage(target.name))) return;
    try {
      const { error } = await restoreClient(id);
      if (error) throw error;
      toast({ title: 'Client restored' });
      fetchClients();
    } catch (error: any) {
      toast({ title: 'Could not restore client', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const target = clients.find((c) => c.id === id);
    if (!target) return;
    try {
      const counts = await getClientRelatedCounts(id);
      if (hasClientRelatedRecords(counts)) {
        toast({
          title: 'Cannot delete client',
          description: buildBlockedDeleteMessage(counts),
          variant: 'destructive',
        });
        return;
      }
      if (!confirm(buildDeleteConfirmMessage())) return;
      const { error } = await deleteClient(id);
      if (error) throw error;
      toast({ title: 'Client deleted successfully' });
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'Error deleting client',
        description: formatClientDeleteError(error?.message || 'Could not delete client.'),
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const matchesClientFilters = (client: Client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const stage = client.status || 'active';
    const matchesStatus = statusFilter === 'all' || stage === statusFilter;
    return matchesSearch && matchesStatus;
  };

  const activeClients = clients.filter((c) => !isClientArchived(c) && matchesClientFilters(c));
  const archivedClients = clients.filter((c) => isClientArchived(c) && matchesClientFilters(c));

  // Sort by pipeline stage order so list/grid/board show clients grouped by status
  const stageOrder = CLIENT_CRM_STAGES.map((s) => s.value);
  const sortedClients = [...activeClients].sort((a, b) => {
    const aStage = a.status || 'active';
    const bStage = b.status || 'active';
    return stageOrder.indexOf(aStage) - stageOrder.indexOf(bStage);
  });

  const sortedArchivedClients = [...archivedClients].sort((a, b) =>
    (b.archived_at || '').localeCompare(a.archived_at || ''),
  );

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
    if (!CLIENT_CRM_STAGES.some((s) => s.value === newStatus)) {
      const targetClient = clients.find((c) => c.id === newStatus);
      newStatus = targetClient?.status || 'active';
    }
    if (!clientId || !CLIENT_CRM_STAGES.some((s) => s.value === newStatus) || currentStatus === newStatus) return;
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
      const errors: string[] = [];
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
        const estimatedVal = get('estimated_value')(row);
        const estimatedValue = estimatedVal ? Number(estimatedVal) : null;
        const nextFollowUp = get('next_follow_up_at')(row);
        const nextFollowUpAt = nextFollowUp ? new Date(nextFollowUp).toISOString() : null;
        const rawStatus = get('status')(row) || 'active';
        const normalizedStatus = (() => {
          const lower = rawStatus.toLowerCase();
          const byValue = CLIENT_CRM_STAGES.find((s) => s.value === lower);
          if (byValue) return byValue.value;
          const byLabel = CLIENT_CRM_STAGES.find((s) => s.label.toLowerCase() === lower);
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
          avatar_color: DEFAULT_CLIENT_AVATAR_COLOR,
          status: normalizedStatus,
          notes: get('notes')(row) || null,
          next_action: get('next_action')(row) || null,
          next_follow_up_at: nextFollowUpAt,
          lead_source: get('lead_source')(row) || null,
          estimated_value: estimatedValue,
          currency: get('currency')(row) || 'USD',
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

  const fmtDate = (value: string | null | undefined) => formatLocaleDate(value, dateFormat);
  const fmtDateTime = (value: string | null | undefined) => formatLocaleDateTime(value, dateFormat, timeFormat);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
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
                    {CLIENT_CRM_STAGES.map((s) => (
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
            <Button
              onClick={() => {
                setEditingClient(null);
                setAddWithStatus(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
            <ClientFormDialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingClient(null);
                  setAddWithStatus(null);
                }
              }}
              editingClient={editingClient}
              defaultStatus={addWithStatus || 'active'}
              onSaved={() => fetchClients()}
            />
          </div>
        </div>

        {/* Search + View + Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle>
              <ViewToggleButton
                active={viewMode === 'board'}
                onClick={() => setViewModeAndNavigate('board')}
                aria-label="Board by status"
                title="Board by status"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'grid'}
                onClick={() => setViewModeAndNavigate('grid')}
                aria-label="Grid view"
                title="Grid"
              >
                <Grid className="h-3.5 w-3.5" />
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'list'}
                onClick={() => setViewModeAndNavigate('list', statusFilter === 'active' ? 'active' : undefined)}
                aria-label="List view"
                title="List"
              >
                <List className="h-3.5 w-3.5" />
              </ViewToggleButton>
            </ViewToggle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative h-8 w-8 p-0" aria-label="Filters">
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-4" align="end">
                <div className="space-y-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {CLIENT_CRM_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                    <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
                    Show archived
                  </label>
                  {activeFilterCount > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full"
                      onClick={() => {
                        setStatusFilter('all');
                        setShowArchived(false);
                      }}
                    >
                      Reset filters
                    </Button>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
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
        ) : sortedClients.length === 0 && (!showArchived || sortedArchivedClients.length === 0) ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-1">
                {clients.length === 0 ? "No clients yet" : clients.every((c) => isClientArchived(c)) ? "No active clients" : "No clients match your filters"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {clients.length === 0
                  ? "Get started by adding your first client"
                  : clients.every((c) => isClientArchived(c))
                    ? "Turn on “Show archived” below to see archived clients, or add a new client."
                    : "Try adjusting search or status filters."}
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
                <HorizontalScroll className="-mx-1" contentClassName="flex gap-4 min-w-max px-1">
                    {CLIENT_CRM_STAGES.map((stage) => {
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
                                  onOpen={() => openClientDetail(client.id)}
                                  onEdit={() => openEditDialog(client)}
                                  onArchive={() => handleArchive(client.id)}
                                  onRestore={() => handleRestore(client.id)}
                                  onDelete={() => handleDelete(client.id)}
                                  formatDate={fmtDate}
                                />
                              ))}
                            </SortableContext>
                            {columnClients.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground text-sm">No clients</div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-muted-foreground border border-dashed border-border bg-muted/30 hover:bg-muted/60"
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
                </HorizontalScroll>
                <DragOverlay>
                  {activeDragClient ? (
                    <div className="w-[300px]">
                      <DraggableClientCard
                        client={activeDragClient}
                        onOpen={() => {}}
                        onEdit={() => {}}
                        onArchive={() => {}}
                        onRestore={() => {}}
                        onDelete={() => {}}
                        formatDate={fmtDate}
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
                  onClick={() => (viewMode === 'grid' || viewMode === 'list') && openClientDetail(client.id)}
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
                            <DropdownMenuItem onClick={() => handleArchive(client.id)}>Archive client</DropdownMenuItem>
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
                        <ClientAvatar client={client} size="md" />
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
                              {getClientStageLabel(client.status)}
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
                          {getClientStageLabel(client.status)}
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
                            <DropdownMenuItem onClick={() => handleArchive(client.id)}>Archive client</DropdownMenuItem>
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

            {showArchived && sortedArchivedClients.length > 0 ? (
              <div className="mt-8 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Archived clients</h4>
                <div className={viewMode === 'grid' ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                  {sortedArchivedClients.map((client) => (
                    <Card
                      key={client.id}
                      className="border border-dashed opacity-80 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openClientDetail(client.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{client.name}</p>
                            <Badge variant="secondary">Archived</Badge>
                          </div>
                          {client.company ? <p className="text-sm text-muted-foreground truncate">{client.company}</p> : null}
                        </div>
                        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => void handleRestore(client.id)}>Restore</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void handleDelete(client.id)}>Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            <Sheet open={!!viewingClient} onOpenChange={(open) => !open && setViewingClient(null)}>
              <SheetContent className="sm:max-w-md overflow-y-auto no-scrollbar">
                <SheetHeader>
                  <SheetTitle>Client details</SheetTitle>
                </SheetHeader>
                {viewingClient && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <ClientAvatar client={viewingClient} size="lg" />
                      <div>
                        <p className="font-semibold text-lg">{viewingClient.name}</p>
                        {viewingClient.company && (
                          <p className="text-sm text-muted-foreground">{viewingClient.company}</p>
                        )}
                        <Badge className={getStatusColor(viewingClient.status || 'active')}>
                          {getClientStageLabel(viewingClient.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Next follow-up</p>
                        <p className="text-sm">
                          {viewingClient.next_follow_up_at
                            ? fmtDate(viewingClient.next_follow_up_at)
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
                                      {f.due_at ? `Due ${fmtDate(f.due_at)}` : 'No due date'}
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
                                    {a.type} • {fmtDateTime(a.occurred_at)}
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
