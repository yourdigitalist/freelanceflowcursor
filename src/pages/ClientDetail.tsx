import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBeforeUnload, useNavigate, useParams } from "react-router-dom";
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
import { ArrowLeft, Check, MoreVertical, X } from "@/components/icons";
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryLabel } from "@/lib/locale-data";
import { useLocalePreferences } from "@/hooks/useLocalePreferences";
import { formatLocaleDate, formatLocaleDateTime } from "@/lib/datetime";
import { ClientPortalSettings } from "@/components/clients/ClientPortalSettings";
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
type Invoice = { id: string; invoice_number: string; status: string; total: number; due_date: string | null };
type Proposal = { id: string; identifier: string; status: string; total: number | null; expires_at: string | null };
type Contract = { id: string; identifier: string; status: string; total: number | null };
type Approval = { id: string; title: string; status: string; created_at: string; project_id: string | null; projects?: { name: string } | null };
type TimeEntry = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  started_at: string | null;
  start_time: string | null;
  total_duration_seconds: number | null;
  duration_minutes: number | null;
  billable: boolean | null;
  billing_status: string | null;
  projects?: { name: string } | null;
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

const statusClass = (status?: string | null) => {
  switch (status) {
    case "active":
    case "accepted":
    case "approved":
      return "bg-success/10 text-success border-success/20";
    case "sent":
    case "pending":
    case "pending_signatures":
      return "bg-warning/10 text-warning border-warning/20";
    case "read":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled":
    case "rejected":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
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

const tagColorClass = (tag: string) => {
  const palette = [
    "bg-blue-50 text-blue-700 border-blue-200",
    "bg-emerald-50 text-emerald-700 border-emerald-200",
    "bg-violet-50 text-violet-700 border-violet-200",
    "bg-amber-50 text-amber-700 border-amber-200",
    "bg-rose-50 text-rose-700 border-rose-200",
    "bg-cyan-50 text-cyan-700 border-cyan-200",
  ];
  const hash = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const formatTag = (tag: string) =>
  tag
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
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
  const { currency: profileCurrency } = useProfileCurrency();
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(true);
  const { dateFormat, timeFormat } = useLocalePreferences();

  const [timeView, setTimeView] = useState<"week" | "month">("week");
  const [timeAnchor, setTimeAnchor] = useState<Date>(new Date());
  const [selectedTimeDay, setSelectedTimeDay] = useState<Date>(new Date());
  const hasUnsavedChanges = useMemo(() => {
    if (!client) return false;
    const formDirty =
      editingInfo &&
      (clientFormSnapshot({ ...formValues, phone: formPhone }) !==
        clientFormSnapshot(clientToFormValues(client, profileCurrency)) ||
        clientLogoPreview !== (client.logo_url ? clientLogoPublicUrl(client.logo_url) : null) ||
        selectedAvatarColor !== (client.avatar_color || DEFAULT_CLIENT_AVATAR_COLOR));
    const followUpDraftDirty = !!newFollowUpTitle.trim() || !!newFollowUpDueAt;
    const tagDraftDirty = isAddingTag && !!newTag.trim();
    const followUpEditDirty = !!editingFollowUpId;
    return formDirty || followUpDraftDirty || tagDraftDirty || followUpEditDirty;
  }, [
    client,
    clientLogoPreview,
    editingFollowUpId,
    editingInfo,
    formPhone,
    formValues,
    isAddingTag,
    newFollowUpDueAt,
    newFollowUpTitle,
    newTag,
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

  useEffect(() => {
    const load = async () => {
      if (!user || !id) return;
      setLoading(true);
      try {
        const [{ data: c, error: cErr }, { data: p }, { data: inv }, { data: prop }, { data: ctr }, { data: appr }, { data: fu }] = await Promise.all([
          supabase.from("clients").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
          supabase.from("projects").select("id, name, status, due_date, budget").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("invoices").select("id, invoice_number, status, total, due_date").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("proposals").select("id, identifier, status, total, expires_at").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("contracts").select("id, identifier, status, total").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("review_requests").select("id, title, status, created_at, project_id, projects(name)").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("client_follow_ups").select("id, title, due_at, completed_at").eq("client_id", id).order("created_at", { ascending: false }),
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

        const projectIds = ((p || []) as Project[]).map((row) => row.id);
        if (projectIds.length > 0) {
          const { data: te } = await supabase
            .from("time_entries")
            .select("id, project_id, task_id, description, started_at, start_time, total_duration_seconds, duration_minutes, billable, billing_status, projects(name), tasks(title)")
            .in("project_id", projectIds)
            .eq("user_id", user.id)
            .order("started_at", { ascending: false });
          setTimeEntries((te || []) as TimeEntry[]);
        } else {
          setTimeEntries([]);
        }
      } catch (error: any) {
        toast({ title: "Failed to load client", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, user]);

  useEffect(() => {
    setSelectedTimeDay(timeAnchor);
  }, [timeAnchor, timeView]);

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
      navigate("/clients");
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

  const saveTag = async () => {
    if (!client) return;
    const cleaned = newTag.trim().replace(/_/g, " ").replace(/\s+/g, " ");
    if (!cleaned) {
      setIsAddingTag(false);
      setNewTag("");
      return;
    }
    const existing = new Set((client.tags || []).map((t) => t.toLowerCase()));
    if (existing.has(cleaned.toLowerCase())) {
      setIsAddingTag(false);
      setNewTag("");
      return;
    }
    const nextTags = [...(client.tags || []), cleaned];
    const { error, data } = await supabase.from("clients").update({ tags: nextTags }).eq("id", client.id).select("*").single();
    if (error) {
      toast({ title: "Failed to add tag", description: error.message, variant: "destructive" });
      return;
    }
    setClient(data as Client);
    syncFormFromClient(data as Client);
    setIsAddingTag(false);
    setNewTag("");
  };

  const saveAllPending = async () => {
    if (editingInfo) await saveClientInfo();
    if (editingFollowUpId) await saveFollowUpEdit();
    if (isAddingTag && newTag.trim()) await saveTag();
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

  const removeTag = async (tagToRemove: string) => {
    if (!client) return;
    const nextTags = (client.tags || []).filter((tag) => tag !== tagToRemove);
    const { error, data } = await supabase.from("clients").update({ tags: nextTags }).eq("id", client.id).select("*").single();
    if (error) {
      toast({ title: "Failed to remove tag", description: error.message, variant: "destructive" });
      return;
    }
    setClient(data as Client);
    syncFormFromClient(data as Client);
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
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <Link to="/clients" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to clients
            </Link>
            <div className="mt-2 flex items-center gap-3">
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
            <p className="mt-1 text-sm text-muted-foreground">
              Client added on {formatUserDate(client.created_at, true)}
            </p>
            {(client.tags || []).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {(client.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline" className={`group relative ${tagColorClass(tag)}`}>
                    {formatTag(tag)}
                    <button
                      type="button"
                      className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
                      onClick={() => void removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {!isAddingTag ? (
                  <button
                    type="button"
                    className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsAddingTag(true)}
                  >
                    + Add tag
                  </button>
                ) : (
                  <span className="flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <Input
                      className="h-6 w-28 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                      placeholder="Tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onBlur={() => void saveTag()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveTag();
                        }
                      }}
                    />
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-2">
                {!isAddingTag ? (
                  <button
                    type="button"
                    className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsAddingTag(true)}
                  >
                    + Add tag
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <Input
                      className="h-6 w-28 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                      placeholder="Tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onBlur={() => void saveTag()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveTag();
                        }
                      }}
                    />
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
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

        <Tabs defaultValue="details" className="space-y-4">
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
                    <p><strong>Company:</strong> {client.company || "—"}</p>
                    <p><strong>Email:</strong> {client.email || "—"}</p>
                    <p><strong>Phone:</strong> {client.phone || "—"}</p>
                    <p><strong>Tax ID:</strong> {client.tax_id || "—"}</p>
                    <p><strong>Currency:</strong> {client.currency || "USD"}</p>
                    <p><strong>Lead source:</strong> {client.lead_source || "—"}</p>
                    <p>
                      <strong>Estimated value:</strong>{" "}
                      {client.estimated_value != null
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: client.currency || "USD",
                            maximumFractionDigits: 2,
                          }).format(client.estimated_value)
                        : "—"}
                    </p>
                    <p><strong>Next follow-up:</strong> {client.next_follow_up_at ? formatUserDate(client.next_follow_up_at) : "—"}</p>
                    <p><strong>Next action:</strong> {client.next_action || "—"}</p>
                    <p className="sm:col-span-2">
                      <strong>Address:</strong>{" "}
                      {[client.street, client.street2, client.city, client.state, client.postal_code, countryLabel(client.country)].filter(Boolean).join(", ") || "—"}
                    </p>
                    <p className="sm:col-span-2">
                      <strong>Tags:</strong> {(client.tags || []).length > 0 ? (client.tags || []).map(formatTag).join(", ") : "—"}
                    </p>
                    <p className="sm:col-span-2 whitespace-pre-wrap">
                      <strong>Notes:</strong> {client.notes || "—"}
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

          </TabsContent>

          <TabsContent value="projects" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Projects</h3>
              <Button asChild><Link to={`/projects?new=1&client=${client.id}`}>Add Project</Link></Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead>Budget</TableHead></TableRow></TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline" className={statusClass(p.status)}>{p.status || "active"}</Badge></TableCell>
                      <TableCell>{p.due_date ? formatUserDate(p.due_date) : "—"}</TableCell>
                      <TableCell>{p.budget ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No projects yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
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
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTimeAnchor((d) => (timeView === "week" ? subWeeks(d, 1) : subMonths(d, 1)))}>Previous</Button>
                <Button variant="outline" onClick={() => setTimeAnchor((d) => (timeView === "week" ? addWeeks(d, 1) : addMonths(d, 1)))}>Next</Button>
                <Button variant="outline" onClick={() => { const now = new Date(); setTimeAnchor(now); setSelectedTimeDay(now); }}>Today</Button>
                <Input
                  type="date"
                  className="h-9 w-[170px]"
                  value={format(selectedTimeDay, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const picked = new Date(`${e.target.value}T12:00:00`);
                    if (Number.isNaN(picked.getTime())) return;
                    setSelectedTimeDay(picked);
                    setTimeAnchor(picked);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant={timeView === "week" ? "default" : "outline"} onClick={() => setTimeView("week")}>Week</Button>
                <Button variant={timeView === "month" ? "default" : "outline"} onClick={() => setTimeView("month")}>Month</Button>
              </div>
            </div>
            {timeView === "week" ? (
              <Card><CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project / Task</TableHead>
                      {days.map((day) => <TableHead key={day.toISOString()}>{format(day, "EEE d")}</TableHead>)}
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRows.map((row, idx) => {
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
                              onClick={() => setSelectedTimeDay(new Date(`${k}T12:00:00`))}
                            >
                              {row.byDay[k] ? formatHm(row.byDay[k]) : "—"}
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
                      {dayKeys.map((k) => <TableCell key={k} className="font-mono font-semibold">{dayTotals[k] ? formatHm(dayTotals[k]) : "—"}</TableCell>)}
                      <TableCell className="font-mono font-semibold">{formatHm(Object.values(dayTotals).reduce((s, v) => s + v, 0))}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent></Card>
            ) : (
              <Card><CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                    <div key={label} className="px-2 py-1 text-xs font-medium text-muted-foreground">{label}</div>
                  ))}
                  {monthGridDays.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const inMonth = d >= monthStart && d <= monthEnd;
                    const total = monthDayTotals[key] || 0;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedTimeDay(d)}
                        className={`rounded-md border min-h-[88px] p-2 text-left ${
                          inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"
                        } ${isSameDay(d, selectedTimeDay) ? "border-primary bg-primary/5" : ""}`}
                      >
                        <p className="text-xs">{format(d, "d")}</p>
                        <p className="mt-2 text-xs font-mono">{total ? formatHm(total) : "0:00"}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent></Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Entries on {formatUserDate(selectedTimeDay)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {selectedDayEntries.length === 0 ? (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">No entries for this day.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project / Task</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDayEntries.map((entry) => {
                        const resumeHref = entry.project_id
                          ? `/time/timer?project=${entry.project_id}${entry.task_id ? `&task=${entry.task_id}` : ""}`
                          : "/time/timer";
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="font-medium">
                                {entry.project_id ? (
                                  <Link to={`/projects/${entry.project_id}`} className="hover:underline">
                                    {entry.projects?.name || "No project"}
                                  </Link>
                                ) : (
                                  entry.projects?.name || "No project"
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{entry.tasks?.title || "No task"}</div>
                            </TableCell>
                            <TableCell>{entry.description || <span className="text-muted-foreground">No notes</span>}</TableCell>
                            <TableCell className="font-mono">{formatHm(toSeconds(entry))}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/time?view=day&edit=${entry.id}`}>Edit</Link>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={resumeHref}>Resume</Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Invoices</h3>
              <Button asChild><Link to={`/invoices?client=${client.id}`}>Create Invoice</Link></Button>
            </div>
            <Card><CardContent className="p-0"><Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/invoices/${row.id}`)}>
                    <TableCell className="font-medium">{row.invoice_number}</TableCell>
                    <TableCell><Badge variant="outline" className={statusClass(row.status)}>{row.status}</Badge></TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.due_date ? formatUserDate(row.due_date) : "—"}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No invoices yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="proposals" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Proposals</h3>
              <Button asChild><Link to={`/proposals?client=${client.id}`}>Create Proposal</Link></Button>
            </div>
            <Card><CardContent className="p-0"><Table>
              <TableHeader><TableRow><TableHead>Proposal</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
              <TableBody>
                {proposals.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/proposals/${row.id}`)}>
                    <TableCell className="font-medium">{row.identifier}</TableCell>
                    <TableCell><Badge variant="outline" className={statusClass(row.status)}>{row.status}</Badge></TableCell>
                    <TableCell>{row.total ?? "—"}</TableCell>
                    <TableCell>{row.expires_at ? formatUserDate(row.expires_at) : "—"}</TableCell>
                  </TableRow>
                ))}
                {proposals.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No proposals yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Contracts</h3>
              <Button asChild><Link to={`/contracts?new=1&client=${client.id}`}>Create Contract</Link></Button>
            </div>
            <Card><CardContent className="p-0"><Table>
              <TableHeader><TableRow><TableHead>Contract</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {contracts.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${row.id}`)}>
                    <TableCell className="font-medium">{row.identifier}</TableCell>
                    <TableCell><Badge variant="outline" className={statusClass(row.status)}>{row.status}</Badge></TableCell>
                    <TableCell>{row.total ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {contracts.length === 0 ? <TableRow><TableCell colSpan={3} className="text-muted-foreground">No contracts yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Approvals</h3>
              <Button asChild><Link to={`/reviews?client=${client.id}`}>Create Approval</Link></Button>
            </div>
            <Card><CardContent className="p-0"><Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Project</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {approvals.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/reviews/${row.id}`)}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell><Badge variant="outline" className={statusClass(row.status)}>{row.status}</Badge></TableCell>
                    <TableCell>{row.projects?.name || "—"}</TableCell>
                    <TableCell>{formatUserDate(row.created_at)}</TableCell>
                  </TableRow>
                ))}
                {approvals.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No approvals yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table></CardContent></Card>
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
      </div>
    </AppLayout>
  );
}

