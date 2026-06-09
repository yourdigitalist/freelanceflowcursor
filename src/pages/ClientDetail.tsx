import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBeforeUnload, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { ClientFormFields } from "@/components/clients/ClientFormFields";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProfileCurrency } from "@/hooks/useProfileCurrency";
import { DEFAULT_CLIENT_AVATAR_COLOR } from "@/lib/clientAvatarColors";
import { CLIENT_CRM_STAGES, getClientStageLabel } from "@/lib/clientCrmStages";
import {
  buildClientDbPayload,
  clientFormSnapshot,
  clientToFormValues,
  emptyClientFormValues,
  type ClientFormValues,
} from "@/lib/clientForm";
import { clientLogoPublicUrl } from "@/lib/clientLogo";
import { resolveClientLogoPath } from "@/lib/clientLogoUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check } from "@/components/icons";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { withDashboardTrail } from "@/lib/breadcrumbs";
import { MenuDotsTrigger } from "@/components/ui/menu-dots-trigger";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfDay, endOfMonth, endOfWeek, format, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import {
  formatDuration,
  sumMonthSecondsFromDayTotals,
  timeMonthCalendarDayClassName,
  timeMonthCalendarDurationClassName,
} from "@/lib/time";
import { formatPortalMoney, resolveMoneyCurrency } from "@/lib/clientPortal";
import { EmptyValue, valueOrEmpty } from "@/components/ui/empty-value";
import { TableStatusBadge } from "@/components/ui/table-status-badge";
import { DataTableFrame } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { countryLabel } from "@/lib/locale-data";
import { useLocalePreferences } from "@/hooks/useLocalePreferences";
import { formatLocaleDate, formatLocaleDateTime } from "@/lib/datetime";
import { ClientPortalSettings } from "@/components/clients/ClientPortalSettings";
import { ClientActivityTimeline } from "@/components/clients/ClientActivityTimeline";
import { buildClientActivityFeed, type ClientActivityRecord } from "@/lib/clientActivityFeed";
import { TimeEntriesTable, type TimeEntriesTableEntry } from "@/components/time/TimeEntriesTable";
import { TimeEntryLogDialog } from "@/components/time/TimeEntryLogDialog";
import {
  ClientDetailCreateDialogs,
  type ClientDetailCreateType,
} from "@/components/clients/ClientDetailCreateDialogs";
import { usePagination } from "@/hooks/usePagination";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { compareDates, compareNullableNumbers, compareStrings } from "@/lib/tableSort";
import { TablePagination } from "@/components/ui/table-pagination";
import { readClientsNavState } from "@/lib/clientsNavigation";
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
} from "@/lib/clientLifecycle";

type Client = {
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
  created_at: string;
  archived_at: string | null;
  portal_enabled: boolean | null;
  portal_token: string | null;
  portal_sections: unknown;
};

type Project = { id: string; name: string; status: string | null; due_date: string | null; budget: number | null };
type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};
type Proposal = {
  id: string;
  identifier: string;
  status: string;
  total: number | null;
  expires_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
};
type Contract = {
  id: string;
  identifier: string;
  status: string;
  total: number | null;
  sent_at: string | null;
  created_at: string;
};
type ClientNote = {
  id: string;
  title: string;
  note_comment: string | null;
  content: string | null;
  created_at: string;
};
type Approval = { id: string; title: string; status: string; created_at: string; project_id: string | null; projects?: { name: string } | null };
type TimeEntry = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  started_at: string | null;
  start_time: string | null;
  end_time: string | null;
  total_duration_seconds: number | null;
  duration_minutes: number | null;
  billable: boolean | null;
  billing_status: string | null;
  projects?: { name: string; client_id: string | null } | null;
  tasks?: { title: string } | null;
};
type FollowUp = {
  id: string;
  title: string;
  due_at: string | null;
  completed_at: string | null;
};
const getClientStatusColor = (status: string | null) => {
  const value = status || "active";
  if (["active", "won"].includes(value)) return "bg-success/10 text-success border-success/20";
  if (["onboarding"].includes(value)) return "bg-primary/10 text-primary border-primary/20";
  if (["proposal_sent", "negotiation", "lead_new", "lead_contacted", "lead_qualified"].includes(value)) {
    return "bg-warning/10 text-warning border-warning/20";
  }
  return "bg-muted text-muted-foreground border-muted";
};

const toSeconds = (entry: TimeEntry) => {
  if (entry.total_duration_seconds != null && entry.total_duration_seconds > 0) return entry.total_duration_seconds;
  if (entry.duration_minutes != null) return entry.duration_minutes * 60;
  return 0;
};

const formatHm = (seconds: number) => {
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

const CLIENT_DETAIL_TABS = [
  "details",
  "projects",
  "time",
  "invoices",
  "proposals",
  "contracts",
  "approvals",
  "portal",
] as const;

type ClientDetailTab = (typeof CLIENT_DETAIL_TABS)[number];

function isClientDetailTab(value: string | null): value is ClientDetailTab {
  return !!value && (CLIENT_DETAIL_TABS as readonly string[]).includes(value);
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ClientDetailTab = isClientDetailTab(tabParam) ? tabParam : "details";
  const setActiveTab = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "details") next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };
  const clientsNav = readClientsNavState(location.state);
  const clientsReturnTo = clientsNav?.clientsReturnTo ?? "/clients";
  const clientsReturnState = clientsNav ?? undefined;

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<ClientActivityRecord[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [newFollowUpTitle, setNewFollowUpTitle] = useState("");
  const [newFollowUpDueAt, setNewFollowUpDueAt] = useState("");
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [editingFollowUpTitle, setEditingFollowUpTitle] = useState("");
  const [editingFollowUpDueAt, setEditingFollowUpDueAt] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);
  const [formValues, setFormValues] = useState<ClientFormValues>(() => emptyClientFormValues());
  const [formPhone, setFormPhone] = useState("");
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null);
  const [selectedAvatarColor, setSelectedAvatarColor] = useState(DEFAULT_CLIENT_AVATAR_COLOR);
  const clientLogoInputRef = useRef<HTMLInputElement>(null);
  const loadedClientIdRef = useRef<string | null>(null);
  const { currency: profileCurrency } = useProfileCurrency();
  const clientMoneyCurrency = resolveMoneyCurrency(client?.currency, profileCurrency);
  const formatClientMoney = (amount: number | null | undefined) =>
    formatPortalMoney(amount, clientMoneyCurrency);
  const [loading, setLoading] = useState(true);
  const [createType, setCreateType] = useState<ClientDetailCreateType>(null);
  const [timeEntryOpen, setTimeEntryOpen] = useState(false);
  const { dateFormat, timeFormat } = useLocalePreferences();

  const [timeView, setTimeView] = useState<"day" | "week" | "month">("week");
  const [timeAnchor, setTimeAnchor] = useState<Date>(new Date());
  const [selectedTimeDay, setSelectedTimeDay] = useState<Date>(new Date());
  const [timeMonthPickerOpen, setTimeMonthPickerOpen] = useState(false);
  const [timeWeekPickerOpen, setTimeWeekPickerOpen] = useState(false);
  const hasUnsavedChanges = useMemo(() => {
    if (!client) return false;
    const formDirty =
      editingInfo &&
      (clientFormSnapshot({ ...formValues, phone: formPhone }) !==
        clientFormSnapshot(clientToFormValues(client, profileCurrency)) ||
        clientLogoPreview !== (client.logo_url ? clientLogoPublicUrl(client.logo_url) : null) ||
        selectedAvatarColor !== (client.avatar_color || DEFAULT_CLIENT_AVATAR_COLOR));
    const followUpDraftDirty = !!newFollowUpTitle.trim() || !!newFollowUpDueAt;
    const followUpEditDirty = !!editingFollowUpId;
    return formDirty || followUpDraftDirty || followUpEditDirty;
  }, [
    client,
    clientLogoPreview,
    editingFollowUpId,
    editingInfo,
    formPhone,
    formValues,
    newFollowUpDueAt,
    newFollowUpTitle,
    profileCurrency,
    selectedAvatarColor,
  ]);
  useBeforeUnload(
    useMemo(
      () => (event) => {
        if (!hasUnsavedChanges) return;
        event.preventDefault();
      },
      [hasUnsavedChanges],
    ),
  );

  const refreshClientData = useCallback(async () => {
    if (!user?.id || !id) return;
    const isInitialLoad = loadedClientIdRef.current !== id;
    if (isInitialLoad) setLoading(true);
    try {
      const [{ data: c, error: cErr }, { data: p }, { data: inv }, { data: prop }, { data: ctr }, { data: appr }, { data: fu }, { data: act }, { data: noteRows }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("projects").select("id, name, status, due_date, budget").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("invoices").select("id, invoice_number, status, total, due_date, created_at, updated_at").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("proposals").select("id, identifier, status, total, expires_at, sent_at, accepted_at, created_at").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("contracts").select("id, identifier, status, total, sent_at, created_at").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("review_requests").select("id, title, status, created_at, project_id, projects(name)").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("client_follow_ups").select("id, title, due_at, completed_at").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("client_activities").select("id, type, body, occurred_at").eq("client_id", id).order("occurred_at", { ascending: false }),
        supabase.from("notes").select("id, title, note_comment, content, created_at").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (cErr) throw cErr;
      const loadedClient = (c as Client) || null;
      setClient(loadedClient);
      if (loadedClient) {
        setFormValues(clientToFormValues(loadedClient, profileCurrency));
        setFormPhone(loadedClient.phone || "");
      }
      setProjects((p || []) as Project[]);
      setInvoices((inv || []) as Invoice[]);
      setProposals((prop || []) as Proposal[]);
      setContracts((ctr || []) as Contract[]);
      setApprovals((appr || []) as Approval[]);
      setFollowUps((fu || []) as FollowUp[]);
      setActivities((act || []) as ClientActivityRecord[]);
      setClientNotes((noteRows || []) as ClientNote[]);

      const projectIds = ((p || []) as Project[]).map((row) => row.id);
      if (projectIds.length > 0) {
        const { data: te } = await supabase
          .from("time_entries")
          .select("id, project_id, task_id, description, started_at, start_time, end_time, total_duration_seconds, duration_minutes, billable, billing_status, projects(name, client_id), tasks(title)")
          .in("project_id", projectIds)
          .eq("user_id", user.id)
          .order("started_at", { ascending: false });
        setTimeEntries((te || []) as TimeEntry[]);
      } else {
        setTimeEntries([]);
      }
      loadedClientIdRef.current = id;
    } catch (error: unknown) {
      toast({
        title: "Failed to load client",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, profileCurrency, toast]);

  useEffect(() => {
    loadedClientIdRef.current = null;
  }, [id]);

  useEffect(() => {
    void refreshClientData();
  }, [refreshClientData]);

  const activityFeedItems = useMemo(() => {
    if (!client) return [];
    return buildClientActivityFeed({
      clientCreatedAt: client.created_at,
      activities,
      proposals,
      contracts,
      invoices,
      notes: clientNotes,
      timeEntries,
    });
  }, [activities, client, clientNotes, contracts, invoices, proposals, timeEntries]);

  const weekRange = useMemo(
    () => ({
      start: startOfWeek(timeAnchor, { weekStartsOn: 1 }),
      end: endOfWeek(timeAnchor, { weekStartsOn: 1 }),
    }),
    [timeAnchor],
  );
  const days = useMemo(() => eachDayOfInterval(weekRange), [weekRange.start, weekRange.end]);
  const dayKeys = useMemo(() => days.map((d) => format(d, "yyyy-MM-dd")), [days]);
  const monthStart = useMemo(() => startOfMonth(timeAnchor), [timeAnchor]);
  const monthEnd = useMemo(() => endOfMonth(timeAnchor), [timeAnchor]);
  const monthGridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const monthGridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const monthGridDays = useMemo(() => eachDayOfInterval({ start: monthGridStart, end: monthGridEnd }), [monthGridStart, monthGridEnd]);

  const switchTimeView = (view: "day" | "week" | "month") => {
    if (view === "day" && timeView !== "day") {
      setSelectedTimeDay((prev) => {
        if (timeView === "week" && prev >= weekRange.start && prev <= weekRange.end) return prev;
        if (timeView === "month" && prev >= monthStart && prev <= monthEnd) return prev;
        return timeAnchor;
      });
    }
    setTimeView(view);
  };

  const groupedRows = useMemo(() => {
    const map = new Map<string, { projectId: string | null; taskId: string | null; projectName: string; taskName: string; notes: string; byDay: Record<string, number> }>();
    timeEntries.forEach((entry) => {
      const dateStr = entry.started_at || entry.start_time;
      if (!dateStr) return;
      const d = parseISO(dateStr);
      if (d < weekRange.start || d > weekRange.end) return;
      const keyDay = format(d, "yyyy-MM-dd");
      const projectName = entry.projects?.name || "No project";
      const taskName = entry.tasks?.title || "No task";
      const notes = entry.description || "";
      const key = `${entry.project_id || "none"}::${entry.task_id || "none"}::${notes}`;
      if (!map.has(key)) map.set(key, { projectId: entry.project_id, taskId: entry.task_id, projectName, taskName, notes, byDay: {} });
      const row = map.get(key)!;
      row.byDay[keyDay] = (row.byDay[keyDay] || 0) + toSeconds(entry);
    });
    return Array.from(map.values());
  }, [timeEntries, weekRange.start, weekRange.end]);

  const dayTotals = useMemo(() => {
    const out: Record<string, number> = {};
    groupedRows.forEach((row) => {
      dayKeys.forEach((k) => {
        out[k] = (out[k] || 0) + (row.byDay[k] || 0);
      });
    });
    return out;
  }, [groupedRows, dayKeys]);

  const clientProjectSort = useTableSort(projects, {
    name: (a, b) => compareStrings(a.name, b.name),
    status: (a, b) => compareStrings(a.status ?? "", b.status ?? ""),
    due: (a, b) => compareDates(a.due_date, b.due_date),
    budget: (a, b) => compareNullableNumbers(a.budget, b.budget),
  });
  const clientInvoiceSort = useTableSort(invoices, {
    invoice: (a, b) => compareStrings(a.invoice_number, b.invoice_number),
    status: (a, b) => compareStrings(a.status, b.status),
    total: (a, b) => compareNullableNumbers(Number(a.total), Number(b.total)),
    due: (a, b) => compareDates(a.due_date, b.due_date),
  });
  const clientProposalSort = useTableSort(proposals, {
    proposal: (a, b) => compareStrings(a.identifier, b.identifier),
    status: (a, b) => compareStrings(a.status, b.status),
    total: (a, b) => compareNullableNumbers(a.total, b.total),
    expires: (a, b) => compareDates(a.expires_at, b.expires_at),
  });
  const clientContractSort = useTableSort(contracts, {
    contract: (a, b) => compareStrings(a.identifier, b.identifier),
    status: (a, b) => compareStrings(a.status, b.status),
    total: (a, b) => compareNullableNumbers(a.total, b.total),
  });
  const clientApprovalSort = useTableSort(approvals, {
    title: (a, b) => compareStrings(a.title, b.title),
    status: (a, b) => compareStrings(a.status, b.status),
    project: (a, b) => compareStrings(a.projects?.name ?? "", b.projects?.name ?? ""),
    created: (a, b) => compareDates(a.created_at, b.created_at),
  });

  const activityPagination = usePagination(activityFeedItems);
  const projectsPagination = usePagination(clientProjectSort.sortedItems);
  const invoicesPagination = usePagination(clientInvoiceSort.sortedItems);
  const proposalsPagination = usePagination(clientProposalSort.sortedItems);
  const contractsPagination = usePagination(clientContractSort.sortedItems);
  const approvalsPagination = usePagination(clientApprovalSort.sortedItems);
  const timeWeekRowsPagination = usePagination(groupedRows);

  const monthDayTotals = useMemo(() => {
    const out: Record<string, number> = {};
    timeEntries.forEach((entry) => {
      const dateStr = entry.started_at || entry.start_time;
      if (!dateStr) return;
      const d = parseISO(dateStr);
      if (d < monthStart || d > monthEnd) return;
      const key = format(d, "yyyy-MM-dd");
      out[key] = (out[key] || 0) + toSeconds(entry);
    });
    return out;
  }, [timeEntries, monthStart, monthEnd]);

  const monthTotalSeconds = useMemo(
    () => sumMonthSecondsFromDayTotals(monthDayTotals, monthStart, monthEnd),
    [monthDayTotals, monthStart, monthEnd],
  );

  const selectedDayEntries = useMemo(
    () =>
      timeEntries
        .filter((entry) => {
          const dateStr = entry.started_at || entry.start_time;
          if (!dateStr) return false;
          return isSameDay(parseISO(dateStr), selectedTimeDay);
        })
        .sort((a, b) => {
          const aDate = parseISO(a.started_at || a.start_time || new Date(0).toISOString()).getTime();
          const bDate = parseISO(b.started_at || b.start_time || new Date(0).toISOString()).getTime();
          return bDate - aDate;
        }),
    [timeEntries, selectedTimeDay],
  );

  const selectedDaySeconds = useMemo(
    () => selectedDayEntries.reduce((sum, entry) => sum + toSeconds(entry), 0),
    [selectedDayEntries],
  );

  const weekEntries = useMemo(
    () =>
      timeEntries
        .filter((entry) => {
          const dateStr = entry.started_at || entry.start_time;
          if (!dateStr) return false;
          const d = parseISO(dateStr);
          return d >= startOfDay(weekRange.start) && d <= endOfDay(weekRange.end);
        })
        .sort((a, b) => {
          const aDate = parseISO(a.started_at || a.start_time || new Date(0).toISOString()).getTime();
          const bDate = parseISO(b.started_at || b.start_time || new Date(0).toISOString()).getTime();
          return bDate - aDate;
        }),
    [timeEntries, weekRange.start, weekRange.end],
  );

  const weekTotalSeconds = useMemo(
    () => weekEntries.reduce((sum, entry) => sum + toSeconds(entry), 0),
    [weekEntries],
  );

  const monthEntries = useMemo(
    () =>
      timeEntries
        .filter((entry) => {
          const dateStr = entry.started_at || entry.start_time;
          if (!dateStr) return false;
          const d = parseISO(dateStr);
          return d >= startOfDay(monthStart) && d <= endOfDay(monthEnd);
        })
        .sort((a, b) => {
          const aDate = parseISO(a.started_at || a.start_time || new Date(0).toISOString()).getTime();
          const bDate = parseISO(b.started_at || b.start_time || new Date(0).toISOString()).getTime();
          return bDate - aDate;
        }),
    [timeEntries, monthStart, monthEnd],
  );

  const visibleTimeEntries = useMemo(
    () => (timeView === "day" ? selectedDayEntries : timeView === "week" ? weekEntries : monthEntries),
    [timeView, selectedDayEntries, weekEntries, monthEntries],
  );

  const clientTimeTableEntries = useMemo<TimeEntriesTableEntry[]>(
    () =>
      visibleTimeEntries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        start_time: entry.start_time ?? entry.started_at ?? new Date(0).toISOString(),
        started_at: entry.started_at,
        project_id: entry.project_id,
        task_id: entry.task_id,
        total_duration_seconds: entry.total_duration_seconds,
        duration_minutes: entry.duration_minutes,
        end_time: entry.end_time,
        billable: entry.billable ?? true,
        billing_status: entry.billing_status,
        projects: entry.projects
          ? { name: entry.projects.name, client_id: entry.projects.client_id ?? client?.id ?? null }
          : null,
        tasks: entry.tasks ?? null,
      })),
    [visibleTimeEntries, client?.id],
  );

  const clientTimeClientById = useMemo(() => {
    const map = new Map<string, import("@/components/clients/ClientAvatar").ClientAvatarClient>();
    if (client?.id && client?.name) {
      map.set(client.id, {
        name: client.name,
        first_name: client.first_name,
        last_name: client.last_name,
        avatar_color: client.avatar_color,
        logo_url: client.logo_url,
      });
    }
    return map;
  }, [client]);

  const getClientEntryStatusBadge = (entry: TimeEntriesTableEntry) => {
    if (!entry.billable) return <TableStatusBadge status="inactive" label="Not billable" />;
    switch (entry.billing_status) {
      case "paid":
        return <TableStatusBadge status="paid" />;
      case "billed":
        return <TableStatusBadge status="billed" label="Billed" />;
      default:
        return <TableStatusBadge status="unbilled" label="Unbilled" />;
    }
  };

  const handleDeleteClientTimeEntry = async (entryId: string) => {
    if (!window.confirm("Delete this time entry?")) return;
    const { error } = await supabase.from("time_entries").delete().eq("id", entryId);
    if (error) {
      toast({ title: "Failed to delete time entry", description: error.message, variant: "destructive" });
      return;
    }
    setTimeEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    toast({ title: "Time entry deleted" });
  };

  const timeBillingSummary = useMemo(() => {
    const summary = {
      unbilledSeconds: 0,
      billedSeconds: 0,
      paidSeconds: 0,
      notBillableSeconds: 0,
    };
    for (const entry of timeEntries) {
      const seconds = toSeconds(entry);
      if (!entry.billable) {
        summary.notBillableSeconds += seconds;
        continue;
      }
      if (entry.billing_status === "paid") summary.paidSeconds += seconds;
      else if (entry.billing_status === "billed") summary.billedSeconds += seconds;
      else summary.unbilledSeconds += seconds;
    }
    return summary;
  }, [timeEntries]);

  const handleArchiveClient = async () => {
    if (!client || !window.confirm(buildArchiveConfirmMessage(client.name))) return;
    const { error } = await archiveClient(client.id);
    if (error) {
      toast({ title: "Failed to archive client", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Client archived" });
    const { data } = await supabase.from("clients").select("*").eq("id", client.id).maybeSingle();
    if (data) setClient(data as Client);
  };

  const handleRestoreClient = async () => {
    if (!client || !window.confirm(buildRestoreConfirmMessage(client.name))) return;
    const { error } = await restoreClient(client.id);
    if (error) {
      toast({ title: "Failed to restore client", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Client restored" });
    const { data } = await supabase.from("clients").select("*").eq("id", client.id).maybeSingle();
    if (data) setClient(data as Client);
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    try {
      const counts = await getClientRelatedCounts(client.id);
      if (hasClientRelatedRecords(counts)) {
        toast({
          title: "Cannot delete client",
          description: buildBlockedDeleteMessage(counts),
          variant: "destructive",
        });
        return;
      }
      if (!window.confirm(buildDeleteConfirmMessage())) return;
      const { error } = await deleteClient(client.id);
      if (error) {
        toast({
          title: "Failed to delete client",
          description: formatClientDeleteError(error.message),
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Client deleted" });
      navigate(clientsReturnTo, { state: clientsReturnState });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not delete client.";
      toast({ title: "Failed to delete client", description: message, variant: "destructive" });
    }
  };

  const resetLogoEditorFromClient = (c: Client) => {
    setClientLogoPreview(c.logo_url ? clientLogoPublicUrl(c.logo_url) : null);
    setSelectedAvatarColor(c.avatar_color || DEFAULT_CLIENT_AVATAR_COLOR);
    if (clientLogoInputRef.current) clientLogoInputRef.current.value = "";
  };

  const syncFormFromClient = (c: Client) => {
    setFormValues(clientToFormValues(c, profileCurrency));
    setFormPhone(c.phone || "");
    resetLogoEditorFromClient(c);
  };

  const startEditingInfo = () => {
    if (!client) return;
    syncFormFromClient(client);
    setEditingInfo(true);
  };

  const cancelEditingInfo = () => {
    if (!client) return;
    syncFormFromClient(client);
    setEditingInfo(false);
  };

  const saveClientInfo = async () => {
    if (!client || !user) return;
    try {
      const logoFile = clientLogoInputRef.current?.files?.[0];
      const logo_url = await resolveClientLogoPath({
        userId: user.id,
        clientId: client.id,
        existingLogoPath: client.logo_url,
        logoFile,
        hasPreview: !!clientLogoPreview,
      });
      const payload = buildClientDbPayload(formValues, {
        phone: formPhone,
        avatar_color: selectedAvatarColor,
        logo_url,
      });
      const { error, data } = await supabase.from("clients").update(payload).eq("id", client.id).select("*").single();
      if (error) throw error;
      const updated = data as Client;
      setClient(updated);
      syncFormFromClient(updated);
      setEditingInfo(false);
      toast({ title: "Client information updated" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save client.";
      toast({ title: "Failed to save client info", description: message, variant: "destructive" });
    }
  };

  const saveStage = async (stage: string) => {
    if (!client || stage === (client.status || "active")) return;
    const { error, data } = await supabase.from("clients").update({ status: stage }).eq("id", client.id).select("*").single();
    if (error) {
      toast({ title: "Failed to update CRM stage", description: error.message, variant: "destructive" });
      return;
    }
    const updated = data as Client;
    setClient(updated);
    if (editingInfo) {
      setFormValues((prev) => ({ ...prev, status: stage }));
    } else {
      syncFormFromClient(updated);
    }
    toast({ title: "CRM stage updated" });
  };

  const saveAllPending = async () => {
    if (editingInfo) await saveClientInfo();
    if (editingFollowUpId) await saveFollowUpEdit();
  };

  const addFollowUp = async () => {
    if (!client || !user || !newFollowUpTitle.trim()) return;
    const { error, data } = await supabase
      .from("client_follow_ups")
      .insert({
        user_id: user.id,
        client_id: client.id,
        title: newFollowUpTitle.trim(),
        due_at: newFollowUpDueAt ? new Date(newFollowUpDueAt).toISOString() : null,
      })
      .select("id, title, due_at, completed_at")
      .single();
    if (error) {
      toast({ title: "Failed to add follow-up", description: error.message, variant: "destructive" });
      return;
    }
    setFollowUps((prev) => [data as FollowUp, ...prev]);
    setNewFollowUpTitle("");
    setNewFollowUpDueAt("");
  };

  const startEditFollowUp = (id: string, title: string, dueAt: string | null) => {
    setEditingFollowUpId(id);
    setEditingFollowUpTitle(title);
    setEditingFollowUpDueAt(dueAt ? dueAt.slice(0, 10) : "");
  };

  const saveFollowUpEdit = async () => {
    if (!client || !editingFollowUpId) return;
    if (editingFollowUpId === "__next_action__") {
      const { error, data } = await supabase
        .from("clients")
        .update({
          next_action: editingFollowUpTitle.trim() || null,
          next_follow_up_at: editingFollowUpDueAt ? new Date(editingFollowUpDueAt).toISOString() : null,
        })
        .eq("id", client.id)
        .select("*")
        .single();
      if (error) {
        toast({ title: "Failed to update follow-up", description: error.message, variant: "destructive" });
        return;
      }
      setClient(data as Client);
      setEditingFollowUpId(null);
      return;
    }
    const { error, data } = await supabase
      .from("client_follow_ups")
      .update({
        title: editingFollowUpTitle.trim(),
        due_at: editingFollowUpDueAt ? new Date(editingFollowUpDueAt).toISOString() : null,
      })
      .eq("id", editingFollowUpId)
      .select("id, title, due_at, completed_at")
      .single();
    if (error) {
      toast({ title: "Failed to update follow-up", description: error.message, variant: "destructive" });
      return;
    }
    setFollowUps((prev) => prev.map((f) => (f.id === editingFollowUpId ? (data as FollowUp) : f)));
    setEditingFollowUpId(null);
  };

  const deleteFollowUp = async (id: string) => {
    if (!client) return;
    if (id === "__next_action__") {
      const { error, data } = await supabase
        .from("clients")
        .update({ next_action: null, next_follow_up_at: null })
        .eq("id", client.id)
        .select("*")
        .single();
      if (error) {
        toast({ title: "Failed to remove follow-up", description: error.message, variant: "destructive" });
        return;
      }
      setClient(data as Client);
      return;
    }
    const { error } = await supabase.from("client_follow_ups").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to remove follow-up", description: error.message, variant: "destructive" });
      return;
    }
    setFollowUps((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleFollowUpDone = async (id: string, done: boolean) => {
    if (!client) return;
    if (id === "__next_action__") {
      if (!done || !client.next_action) return;
      const { data: inserted, error: insertError } = await supabase
        .from("client_follow_ups")
        .insert({
          user_id: user.id,
          client_id: client.id,
          title: client.next_action,
          due_at: client.next_follow_up_at,
          completed_at: new Date().toISOString(),
        })
        .select("id, title, due_at, completed_at")
        .single();
      if (insertError) {
        toast({ title: "Failed to complete follow-up", description: insertError.message, variant: "destructive" });
        return;
      }
      const { error, data } = await supabase
        .from("clients")
        .update({ next_action: null, next_follow_up_at: null })
        .eq("id", client.id)
        .select("*")
        .single();
      if (error) {
        toast({ title: "Failed to clear pending reminder", description: error.message, variant: "destructive" });
        return;
      }
      setFollowUps((prev) => [inserted as FollowUp, ...prev]);
      setClient(data as Client);
      return;
    }
    const { error, data } = await supabase
      .from("client_follow_ups")
      .update({ completed_at: done ? new Date().toISOString() : null })
      .eq("id", id)
      .select("id, title, due_at, completed_at")
      .single();
    if (error) {
      toast({ title: "Failed to update follow-up", description: error.message, variant: "destructive" });
      return;
    }
    setFollowUps((prev) => prev.map((f) => (f.id === id ? (data as FollowUp) : f)));
  };

  const followUpRows = useMemo(() => {
    const rows: Array<{ id: string; title: string; due_at: string | null; completed_at: string | null; source: "next_action" | "follow_up" }> = [];
    if (client?.next_action) {
      rows.push({
        id: "__next_action__",
        title: client.next_action,
        due_at: client.next_follow_up_at,
        completed_at: null,
        source: "next_action",
      });
    }
    followUps.forEach((f) => rows.push({ id: f.id, title: f.title, due_at: f.due_at, completed_at: f.completed_at, source: "follow_up" }));
    return rows;
  }, [client?.next_action, client?.next_follow_up_at, followUps]);

  const formatUserDate = (value: string | Date | null | undefined, includeTime = false) => {
    return includeTime ? formatLocaleDateTime(value, dateFormat, timeFormat) : formatLocaleDate(value, dateFormat);
  };

  const isCurrentWeek = isSameDay(weekRange.start, startOfWeek(new Date(), { weekStartsOn: 1 }));
  const isCurrentMonth = monthStart.getFullYear() === new Date().getFullYear() && monthStart.getMonth() === new Date().getMonth();

  const goToCurrentWeek = () => {
    const now = new Date();
    setTimeAnchor(now);
    setSelectedTimeDay(now);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setTimeAnchor(now);
    setSelectedTimeDay(now);
  };

  const setTimeMonth = (year: number, monthIndex: number) => {
    const next = new Date(year, monthIndex, 1);
    setTimeAnchor(next);
    setSelectedTimeDay(next);
  };

  const shiftTimePeriod = (direction: "prev" | "next") => {
    if (timeView === "month") {
      setTimeAnchor((d) => {
        const next = new Date(d.getFullYear(), d.getMonth() + (direction === "prev" ? -1 : 1), 1);
        setSelectedTimeDay(next);
        return next;
      });
      return;
    }
    if (timeView === "day") {
      setTimeAnchor((d) => {
        const next = direction === "prev" ? subDays(d, 1) : addDays(d, 1);
        setSelectedTimeDay(next);
        return next;
      });
      return;
    }
    setTimeAnchor((d) => {
      const currentWeekStart = startOfWeek(d, { weekStartsOn: 1 });
      const nextWeekStart = direction === "prev" ? subWeeks(currentWeekStart, 1) : addWeeks(currentWeekStart, 1);
      const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
      setSelectedTimeDay((prev) => {
        if (prev >= nextWeekStart && prev <= nextWeekEnd) return prev;
        return nextWeekStart;
      });
      return nextWeekStart;
    });
  };

  const renderClientTimeWeekPeriodPicker = () => (
    <Popover open={timeWeekPickerOpen} onOpenChange={setTimeWeekPickerOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          {isCurrentWeek
            ? `This week ${formatUserDate(weekRange.start)} – ${formatUserDate(weekRange.end)}`
            : `${formatUserDate(weekRange.start)} – ${formatUserDate(weekRange.end)}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedTimeDay}
          onSelect={(date) => {
            if (!date) return;
            setSelectedTimeDay(date);
            setTimeAnchor(date);
            setTimeWeekPickerOpen(false);
          }}
          defaultMonth={selectedTimeDay}
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
              setTimeWeekPickerOpen(false);
            }}
          >
            This week
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (loading) return <AppLayout><div className="text-sm text-muted-foreground">Loading client...</div></AppLayout>;
  if (!client) return <AppLayout><div className="text-sm text-muted-foreground">Client not found.</div></AppLayout>;

  const clientArchived = isClientArchived(client);

  return (
    <AppLayout>
      <div className="space-y-6">
        {clientArchived ? (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <p>
              This client is archived. They are hidden from your main client list and cannot be selected for new work.
            </p>
            <Button size="sm" onClick={() => void handleRestoreClient()}>Restore client</Button>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 pb-4">
          <div>
            <PageBreadcrumb
              items={withDashboardTrail([
                {
                  label: clientsReturnTo === "/clients" ? "CRM" : "Clients",
                  href: clientsReturnTo,
                },
                { label: client.name },
              ])}
            />
            <div className="mt-1 flex items-center gap-3">
              <ClientAvatar client={client} size="lg" />
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button">
                    <Badge variant="outline" className={getClientStatusColor(client.status)}>{getClientStageLabel(client.status)}</Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {CLIENT_CRM_STAGES.map((stage) => (
                    <DropdownMenuItem key={stage.value} onClick={() => void saveStage(stage.value)}>
                      {stage.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden text-sm text-muted-foreground lg:block">
              Client added on {formatUserDate(client.created_at, true)}
            </p>
            <DropdownMenu>
              <MenuDotsTrigger />
              <DropdownMenuContent align="end">
                {clientArchived ? (
                  <DropdownMenuItem onClick={() => void handleRestoreClient()}>Restore client</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => void handleArchiveClient()}>Archive client</DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => void handleDeleteClient()}>
                  Delete client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            {[
              ["details", "Client Details"],
              ["projects", "Projects"],
              ["time", "Time"],
              ["invoices", "Invoices"],
              ["proposals", "Proposals"],
              ["contracts", "Contracts"],
              ["approvals", "Approvals"],
              ["portal", "Portal"],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Client Information</CardTitle>
                {editingInfo ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={cancelEditingInfo}>Cancel</Button>
                    <Button onClick={saveClientInfo}>Save</Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={startEditingInfo}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {editingInfo ? (
                  <ClientFormFields
                    values={formValues}
                    onChange={(patch) => setFormValues((prev) => ({ ...prev, ...patch }))}
                    phone={formPhone}
                    onPhoneChange={setFormPhone}
                    logoPreviewUrl={clientLogoPreview}
                    onLogoPreviewChange={setClientLogoPreview}
                    selectedAvatarColor={selectedAvatarColor}
                    onSelectedAvatarColorChange={setSelectedAvatarColor}
                    logoFileInputRef={clientLogoInputRef}
                    fallbackName={
                      [formValues.first_name, formValues.last_name].filter(Boolean).join(" ").trim() ||
                      client.name
                    }
                    profileCurrency={profileCurrency}
                    fieldIdPrefix="client-detail"
                  />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p><strong>Name:</strong> {client.name}</p>
                    <p><strong>Status:</strong> {getClientStageLabel(client.status)}</p>
                    <p><strong>Company:</strong> {valueOrEmpty(client.company, { variant: 'detail', field: 'company' })}</p>
                    <p><strong>Email:</strong> {valueOrEmpty(client.email, { variant: 'detail', field: 'email' })}</p>
                    <p><strong>Phone:</strong> {valueOrEmpty(client.phone, { variant: 'detail', field: 'phone' })}</p>
                    <p><strong>Tax ID:</strong> {valueOrEmpty(client.tax_id, { variant: 'detail', field: 'tax_id' })}</p>
                    <p><strong>Currency:</strong> {clientMoneyCurrency}</p>
                    <p><strong>Lead source:</strong> {valueOrEmpty(client.lead_source, { variant: 'detail', field: 'lead_source' })}</p>
                    <p>
                      <strong>Estimated value:</strong>{' '}
                      {client.estimated_value != null && !Number.isNaN(Number(client.estimated_value)) ? (
                        formatClientMoney(client.estimated_value)
                      ) : (
                        <EmptyValue variant="detail" field="value" />
                      )}
                    </p>
                    <p>
                      <strong>Next follow-up:</strong>{' '}
                      {client.next_follow_up_at ? (
                        formatUserDate(client.next_follow_up_at)
                      ) : (
                        <EmptyValue variant="detail" field="next_follow_up" />
                      )}
                    </p>
                    <p><strong>Next action:</strong> {valueOrEmpty(client.next_action, { variant: 'detail', field: 'next_action' })}</p>
                    <p className="sm:col-span-2">
                      <strong>Address:</strong>{' '}
                      {valueOrEmpty(
                        [client.street, client.street2, client.city, client.state, client.postal_code, countryLabel(client.country)]
                          .filter(Boolean)
                          .join(', '),
                        { variant: 'detail', field: 'address' },
                      )}
                    </p>
                    <p className="sm:col-span-2 whitespace-pre-wrap">
                      <strong>Notes:</strong> {valueOrEmpty(client.notes, { variant: 'detail', field: 'notes' })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base font-semibold">Follow-up Tasks</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
                  <Input placeholder="New follow-up task" value={newFollowUpTitle} onChange={(e) => setNewFollowUpTitle(e.target.value)} />
                  <Input type="date" value={newFollowUpDueAt} onChange={(e) => setNewFollowUpDueAt(e.target.value)} />
                  <Button onClick={addFollowUp} disabled={!newFollowUpTitle.trim()}>Add</Button>
                </div>
                <div className="space-y-2">
                  {followUpRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No follow-up tasks yet.</p>
                  ) : (
                    followUpRows.map((task) => (
                      <div key={task.id} className="rounded-md border p-3">
                        {editingFollowUpId === task.id ? (
                          <div className="grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
                            <Input value={editingFollowUpTitle} onChange={(e) => setEditingFollowUpTitle(e.target.value)} />
                            <Input type="date" value={editingFollowUpDueAt} onChange={(e) => setEditingFollowUpDueAt(e.target.value)} />
                            <Button variant="outline" onClick={() => setEditingFollowUpId(null)}>Cancel</Button>
                            <Button onClick={saveFollowUpEdit}>Save</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${task.completed_at ? "text-success line-through" : ""}`}>
                                {task.title}
                              </p>
                              <p className="text-xs text-muted-foreground">{task.due_at ? `Due ${formatUserDate(task.due_at)}` : "No due date"}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className={task.completed_at ? "text-success border-success/30" : ""}
                                onClick={() => void toggleFollowUpDone(task.id, !task.completed_at)}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                {task.completed_at ? "Done" : "Mark done"}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => startEditFollowUp(task.id, task.title, task.due_at)}>Edit</Button>
                              <Button variant="outline" size="sm" onClick={() => void deleteFollowUp(task.id)}>Delete</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientActivityTimeline
                  items={activityPagination.paginatedItems}
                  loading={loading}
                  highlightItemId={activityFeedItems[0]?.id}
                />
              </CardContent>
              <TablePagination
                total={activityPagination.total}
                page={activityPagination.page}
                pageSize={activityPagination.pageSize}
                from={activityPagination.from}
                to={activityPagination.to}
                pageSizeOptions={activityPagination.pageSizeOptions}
                showPageSizeSelect={activityPagination.showPageSizeSelect}
                onPageChange={activityPagination.setPage}
                onPageSizeChange={activityPagination.setPageSize}
              />
            </Card>

          </TabsContent>

          <TabsContent value="projects" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Projects</h3>
              <Button onClick={() => setCreateType("project")}>Add Project</Button>
            </div>
            <Card><CardContent className="flex flex-col p-0">
              <DataTableFrame>
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent">
                  <SortableTableHead label="Name" sortKey="name" sort={clientProjectSort} />
                  <SortableTableHead label="Status" sortKey="status" sort={clientProjectSort} />
                  <SortableTableHead label="Due" sortKey="due" sort={clientProjectSort} />
                  <SortableTableHead label="Budget" sortKey="budget" sort={clientProjectSort} align="right" className="text-right" />
                </TableRow></TableHeader>
                <TableBody>
                  {projectsPagination.paginatedItems.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                      <TableCell className="font-semibold">{p.name}</TableCell>
                      <TableCell><TableStatusBadge status={p.status || "active"} /></TableCell>
                      <TableCell>
                        {p.due_date ? formatUserDate(p.due_date) : <EmptyValue variant="table" />}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {p.budget != null && !Number.isNaN(Number(p.budget)) ? (
                          formatClientMoney(p.budget)
                        ) : (
                          <EmptyValue variant="table" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projectsPagination.total === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No projects yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
              <TablePagination
                total={projectsPagination.total}
                page={projectsPagination.page}
                pageSize={projectsPagination.pageSize}
                from={projectsPagination.from}
                to={projectsPagination.to}
                pageSizeOptions={projectsPagination.pageSizeOptions}
                showPageSizeSelect={projectsPagination.showPageSizeSelect}
                onPageChange={projectsPagination.setPage}
                onPageSizeChange={projectsPagination.setPageSize}
              />
              </DataTableFrame>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Time</h3>
              <Button variant="outline" asChild><Link to={`/time?view=week&client=${client.id}`}>Open Full Timesheet</Link></Button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Unbilled</p>
                  <p className="font-mono text-sm font-semibold">{formatHm(timeBillingSummary.unbilledSeconds)}</p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Billed</p>
                  <p className="font-mono text-sm font-semibold">{formatHm(timeBillingSummary.billedSeconds)}</p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-mono text-sm font-semibold">{formatHm(timeBillingSummary.paidSeconds)}</p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Not billable</p>
                  <p className="font-mono text-sm font-semibold">{formatHm(timeBillingSummary.notBillableSeconds)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shiftTimePeriod("prev")}
                  aria-label="Previous period"
                >
                  ←
                </Button>
                {timeView === "month" ? (
                  <Popover open={timeMonthPickerOpen} onOpenChange={setTimeMonthPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" type="button">
                        {isCurrentMonth
                          ? `This month ${format(monthStart, "MMM yyyy")}`
                          : format(monthStart, "MMM yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Select
                            value={String(timeAnchor.getMonth())}
                            onValueChange={(m) => setTimeMonth(timeAnchor.getFullYear(), Number(m))}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {format(new Date(2024, i, 1), "MMMM")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={String(timeAnchor.getFullYear())}
                            onValueChange={(y) => setTimeMonth(Number(y), timeAnchor.getMonth())}
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
                            setTimeMonthPickerOpen(false);
                          }}
                        >
                          This month
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  renderClientTimeWeekPeriodPicker()
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shiftTimePeriod("next")}
                  aria-label="Next period"
                >
                  →
                </Button>
                {(timeView === "day" || timeView === "week") && (
                  <span className="text-sm text-muted-foreground">
                    Week total:{" "}
                    <span className="font-mono font-medium text-foreground">{formatHm(weekTotalSeconds)}</span>
                  </span>
                )}
              </div>
              <div className="flex rounded-lg border bg-muted/50 p-0.5">
                <Button variant={timeView === "day" ? "default" : "ghost"} size="sm" onClick={() => switchTimeView("day")}>Day</Button>
                <Button variant={timeView === "week" ? "default" : "ghost"} size="sm" onClick={() => switchTimeView("week")}>Week</Button>
                <Button variant={timeView === "month" ? "default" : "ghost"} size="sm" onClick={() => switchTimeView("month")}>Month</Button>
              </div>
            </div>
            {timeView === "week" ? (
              <Card><CardContent className="flex flex-col p-0 overflow-x-auto">
                <DataTableFrame>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project / Task</TableHead>
                      {days.map((day) => <TableHead key={day.toISOString()}>{format(day, "EEE d")}</TableHead>)}
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeWeekRowsPagination.paginatedItems.map((row, idx) => {
                      const rowTotal = dayKeys.reduce((sum, k) => sum + (row.byDay[k] || 0), 0);
                      const rowTimerHref = row.projectId
                        ? `/time/timer?project=${row.projectId}${row.taskId ? `&task=${row.taskId}` : ""}`
                        : "/time/timer";
                      return (
                        <TableRow key={`${row.projectName}-${row.taskName}-${idx}`}>
                          <TableCell>
                            <div className="font-medium">
                              {row.projectId ? (
                                <Link to={`/projects/${row.projectId}`} className="hover:underline">
                                  {row.projectName}
                                </Link>
                              ) : (
                                row.projectName
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{row.taskName}</div>
                          </TableCell>
                          {dayKeys.map((k) => (
                            <TableCell
                              key={k}
                              className="font-mono cursor-pointer hover:bg-muted/40"
                              onClick={() => {
                                const day = new Date(`${k}T12:00:00`);
                                setSelectedTimeDay(day);
                                setTimeAnchor(day);
                                switchTimeView("day");
                              }}
                            >
                              {row.byDay[k] ? formatHm(row.byDay[k]) : <EmptyValue variant="table" />}
                            </TableCell>
                          ))}
                          <TableCell className="font-mono font-medium">{formatHm(rowTotal)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={rowTimerHref}>Resume</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      {dayKeys.map((k) => (
                        <TableCell key={k} className="font-mono font-semibold">
                          {dayTotals[k] ? formatHm(dayTotals[k]) : <EmptyValue variant="table" />}
                        </TableCell>
                      ))}
                      <TableCell className="font-mono font-semibold">{formatHm(Object.values(dayTotals).reduce((s, v) => s + v, 0))}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
                <TablePagination
                  total={timeWeekRowsPagination.total}
                  page={timeWeekRowsPagination.page}
                  pageSize={timeWeekRowsPagination.pageSize}
                  from={timeWeekRowsPagination.from}
                  to={timeWeekRowsPagination.to}
                  pageSizeOptions={timeWeekRowsPagination.pageSizeOptions}
                  showPageSizeSelect={timeWeekRowsPagination.showPageSizeSelect}
                  onPageChange={timeWeekRowsPagination.setPage}
                  onPageSizeChange={timeWeekRowsPagination.setPageSize}
                />
                </DataTableFrame>
              </CardContent></Card>
            ) : timeView === "month" ? (
              <Card><CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                    <div key={label} className="px-2 py-1 text-xs font-medium text-muted-foreground">{label}</div>
                  ))}
                  {monthGridDays.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const inMonth = d >= monthStart && d <= monthEnd;
                    const total = monthDayTotals[key] || 0;
                    const hasEntries = total > 0;
                    const isSelected = isSameDay(d, selectedTimeDay);
                    const isToday = isSameDay(d, new Date());
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedTimeDay(d);
                          setTimeAnchor(d);
                          switchTimeView("day");
                        }}
                        className={timeMonthCalendarDayClassName({
                          inMonth,
                          totalSeconds: total,
                          isSelected,
                          isToday,
                        })}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs">{format(d, "d")}</p>
                          {isToday ? (
                            <span className="rounded-full border border-emerald-600/40 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Today
                            </span>
                          ) : null}
                        </div>
                        <p className={timeMonthCalendarDurationClassName(hasEntries)}>
                          {hasEntries ? formatHm(total) : "0:00"}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-end border-t pt-3">
                  <p className="text-sm font-medium text-foreground">
                    Month total:{" "}
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatDuration(monthTotalSeconds)}
                    </span>
                  </p>
                </div>
              </CardContent></Card>
            ) : null}
            {timeView === "day" ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{formatUserDate(selectedTimeDay)}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    Day total: <span className="font-mono">{formatHm(selectedDaySeconds)}</span>
                  </p>
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {timeView === "day"
                    ? `Entries on ${formatUserDate(selectedTimeDay)}`
                    : timeView === "week"
                      ? `Entries for week of ${formatUserDate(weekRange.start)} – ${formatUserDate(weekRange.end)}`
                      : `Entries for ${format(monthStart, "MMMM yyyy")}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col p-0">
                {visibleTimeEntries.length === 0 ? (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">
                    {timeView === "day"
                      ? "No entries for this day."
                      : timeView === "week"
                        ? "No entries for this week."
                        : "No entries for this month."}
                  </div>
                ) : (
                  <TimeEntriesTable
                    entries={clientTimeTableEntries}
                    clientById={clientTimeClientById}
                    formatUserDate={(value) => formatUserDate(value)}
                    getEntrySeconds={(entry) =>
                      entry.total_duration_seconds != null ? entry.total_duration_seconds : (entry.duration_minutes || 0) * 60
                    }
                    getStatusBadge={getClientEntryStatusBadge}
                    onEdit={(entry) => navigate(`/time?view=day&edit=${entry.id}`)}
                    onDelete={handleDeleteClientTimeEntry}
                    onResume={(entryId) => {
                      const entry = clientTimeTableEntries.find((row) => row.id === entryId);
                      const resumeHref = entry?.project_id
                        ? `/time/timer?project=${entry.project_id}${entry.task_id ? `&task=${entry.task_id}` : ""}`
                        : "/time/timer";
                      navigate(resumeHref);
                    }}
                  />
                )}
                {visibleTimeEntries.length > 0 ? (
                  <div className="mt-2 flex items-center justify-end border-t px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {timeView === "day" ? "Day total: " : timeView === "week" ? "Week total: " : "Month total: "}
                      <span className="font-mono">
                        {formatHm(timeView === "day" ? selectedDaySeconds : timeView === "week" ? weekTotalSeconds : monthTotalSeconds)}
                      </span>
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center justify-end border-t px-4 py-3">
                  <Button variant="outline" size="sm" onClick={() => setTimeEntryOpen(true)}>
                    + Add entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Invoices</h3>
              <Button onClick={() => setCreateType("invoice")}>Create Invoice</Button>
            </div>
            <Card><CardContent className="flex flex-col p-0">
              <DataTableFrame>
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <SortableTableHead label="Invoice" sortKey="invoice" sort={clientInvoiceSort} />
                <SortableTableHead label="Status" sortKey="status" sort={clientInvoiceSort} />
                <SortableTableHead label="Total" sortKey="total" sort={clientInvoiceSort} align="right" className="text-right" />
                <SortableTableHead label="Due" sortKey="due" sort={clientInvoiceSort} />
              </TableRow></TableHeader>
              <TableBody>
                {invoicesPagination.paginatedItems.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/invoices/${row.id}`)}>
                    <TableCell className="font-semibold">{row.invoice_number}</TableCell>
                    <TableCell><TableStatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.total != null && !Number.isNaN(Number(row.total)) ? (
                        formatClientMoney(row.total)
                      ) : (
                        <EmptyValue variant="table" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.due_date ? formatUserDate(row.due_date) : <EmptyValue variant="table" />}
                    </TableCell>
                  </TableRow>
                ))}
                {invoicesPagination.total === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No invoices yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <TablePagination
              total={invoicesPagination.total}
              page={invoicesPagination.page}
              pageSize={invoicesPagination.pageSize}
              from={invoicesPagination.from}
              to={invoicesPagination.to}
              pageSizeOptions={invoicesPagination.pageSizeOptions}
              showPageSizeSelect={invoicesPagination.showPageSizeSelect}
              onPageChange={invoicesPagination.setPage}
              onPageSizeChange={invoicesPagination.setPageSize}
            />
            </DataTableFrame>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="proposals" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Proposals</h3>
              <Button onClick={() => setCreateType("proposal")}>Create Proposal</Button>
            </div>
            <Card><CardContent className="flex flex-col p-0">
              <DataTableFrame>
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <SortableTableHead label="Proposal" sortKey="proposal" sort={clientProposalSort} />
                <SortableTableHead label="Status" sortKey="status" sort={clientProposalSort} />
                <SortableTableHead label="Total" sortKey="total" sort={clientProposalSort} align="right" className="text-right" />
                <SortableTableHead label="Expires" sortKey="expires" sort={clientProposalSort} />
              </TableRow></TableHeader>
              <TableBody>
                {proposalsPagination.paginatedItems.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/proposals/${row.id}`)}>
                    <TableCell className="font-semibold">{row.identifier}</TableCell>
                    <TableCell><TableStatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatClientMoney(row.total)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.expires_at ? formatUserDate(row.expires_at) : <EmptyValue variant="table" />}
                    </TableCell>
                  </TableRow>
                ))}
                {proposalsPagination.total === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No proposals yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <TablePagination
              total={proposalsPagination.total}
              page={proposalsPagination.page}
              pageSize={proposalsPagination.pageSize}
              from={proposalsPagination.from}
              to={proposalsPagination.to}
              pageSizeOptions={proposalsPagination.pageSizeOptions}
              showPageSizeSelect={proposalsPagination.showPageSizeSelect}
              onPageChange={proposalsPagination.setPage}
              onPageSizeChange={proposalsPagination.setPageSize}
            />
            </DataTableFrame>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Contracts</h3>
              <Button onClick={() => setCreateType("contract")}>Create Contract</Button>
            </div>
            <Card><CardContent className="flex flex-col p-0">
              <DataTableFrame>
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <SortableTableHead label="Contract" sortKey="contract" sort={clientContractSort} />
                <SortableTableHead label="Status" sortKey="status" sort={clientContractSort} />
                <SortableTableHead label="Total" sortKey="total" sort={clientContractSort} align="right" className="text-right" />
              </TableRow></TableHeader>
              <TableBody>
                {contractsPagination.paginatedItems.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${row.id}`)}>
                    <TableCell className="font-semibold">{row.identifier}</TableCell>
                    <TableCell><TableStatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatClientMoney(row.total)}</TableCell>
                  </TableRow>
                ))}
                {contractsPagination.total === 0 ? <TableRow><TableCell colSpan={3} className="text-muted-foreground">No contracts yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <TablePagination
              total={contractsPagination.total}
              page={contractsPagination.page}
              pageSize={contractsPagination.pageSize}
              from={contractsPagination.from}
              to={contractsPagination.to}
              pageSizeOptions={contractsPagination.pageSizeOptions}
              showPageSizeSelect={contractsPagination.showPageSizeSelect}
              onPageChange={contractsPagination.setPage}
              onPageSizeChange={contractsPagination.setPageSize}
            />
            </DataTableFrame>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Approvals</h3>
              <Button onClick={() => setCreateType("approval")}>Create Approval</Button>
            </div>
            <Card><CardContent className="flex flex-col p-0">
              <DataTableFrame>
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <SortableTableHead label="Title" sortKey="title" sort={clientApprovalSort} />
                <SortableTableHead label="Status" sortKey="status" sort={clientApprovalSort} />
                <SortableTableHead label="Project" sortKey="project" sort={clientApprovalSort} />
                <SortableTableHead label="Created" sortKey="created" sort={clientApprovalSort} />
              </TableRow></TableHeader>
              <TableBody>
                {approvalsPagination.paginatedItems.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/reviews/${row.id}`)}>
                    <TableCell className="font-semibold">{row.title}</TableCell>
                    <TableCell><TableStatusBadge status={row.status} /></TableCell>
                    <TableCell>
                      {row.projects?.name ? row.projects.name : <EmptyValue variant="table" field="project" />}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatUserDate(row.created_at)}</TableCell>
                  </TableRow>
                ))}
                {approvalsPagination.total === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No approvals yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <TablePagination
              total={approvalsPagination.total}
              page={approvalsPagination.page}
              pageSize={approvalsPagination.pageSize}
              from={approvalsPagination.from}
              to={approvalsPagination.to}
              pageSizeOptions={approvalsPagination.pageSizeOptions}
              showPageSizeSelect={approvalsPagination.showPageSizeSelect}
              onPageChange={approvalsPagination.setPage}
              onPageSizeChange={approvalsPagination.setPageSize}
            />
            </DataTableFrame>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="portal" className="space-y-3">
            <ClientPortalSettings
              client={{
                id: client.id,
                name: client.name,
                email: client.email,
                portal_enabled: client.portal_enabled,
                portal_token: client.portal_token,
                portal_sections: client.portal_sections,
                logo_url: client.logo_url,
                avatar_color: client.avatar_color,
              }}
              onClientUpdate={(patch) => setClient((prev) => (prev ? { ...prev, ...patch } : prev))}
            />
          </TabsContent>
        </Tabs>

        <ClientDetailCreateDialogs
          client={client}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          createType={createType}
          onCreateTypeChange={setCreateType}
          onRefresh={refreshClientData}
          onProjectsChange={(next) =>
            setProjects((prev) => {
              const byId = new Map(prev.map((p) => [p.id, p]));
              for (const p of next) {
                const existing = byId.get(p.id);
                byId.set(p.id, existing ? { ...existing, name: p.name } : { ...p, status: "active", due_date: null, budget: null });
              }
              return Array.from(byId.values());
            })
          }
        />

        <TimeEntryLogDialog
          open={timeEntryOpen}
          onOpenChange={setTimeEntryOpen}
          restrictToClientId={client.id}
          defaultProjectId={projects.length === 1 ? projects[0].id : ""}
          defaultDate={format(selectedTimeDay, "yyyy-MM-dd")}
          onSaved={() => void refreshClientData()}
        />
      </div>
    </AppLayout>
  );
}

