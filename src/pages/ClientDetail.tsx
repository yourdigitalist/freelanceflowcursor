import { useEffect, useMemo, useState } from "react";
import { Link, useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Check, MoreVertical, X } from "@/components/icons";
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  status: string | null;
  notes: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
  lead_source: string | null;
  estimated_value: number | null;
  currency: string | null;
  tags: string[] | null;
  created_at: string;
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
  projects?: { name: string } | null;
  tasks?: { title: string } | null;
};
type FollowUp = {
  id: string;
  title: string;
  due_at: string | null;
  completed_at: string | null;
};
const CRM_STAGES: Array<{ value: string; label: string }> = [
  { value: "lead_new", label: "New lead" },
  { value: "lead_contacted", label: "Contacted" },
  { value: "lead_qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "inactive", label: "Inactive" },
  { value: "closed_lost", label: "Closed lost" },
];

const getClientStageLabel = (value: string | null) => CRM_STAGES.find((s) => s.value === (value || "active"))?.label || "Active";

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
  const [notesDraft, setNotesDraft] = useState("");
  const [infoDraft, setInfoDraft] = useState<Partial<Client>>({});
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [dateFormatPreference, setDateFormatPreference] = useState("MM/DD/YYYY");
  const [loading, setLoading] = useState(true);

  const [timeView, setTimeView] = useState<"week" | "month">("week");
  const [timeAnchor, setTimeAnchor] = useState<Date>(new Date());
  const hasUnsavedChanges = useMemo(() => {
    if (!client) return false;
    const infoDirty =
      editingInfo &&
      JSON.stringify({
        first_name: infoDraft.first_name || "",
        last_name: infoDraft.last_name || "",
        company: infoDraft.company || "",
        email: infoDraft.email || "",
        phone: infoDraft.phone || "",
        tax_id: infoDraft.tax_id || "",
        street: infoDraft.street || "",
        street2: infoDraft.street2 || "",
        city: infoDraft.city || "",
        state: infoDraft.state || "",
        postal_code: infoDraft.postal_code || "",
        country: infoDraft.country || "",
        lead_source: infoDraft.lead_source || "",
        estimated_value: infoDraft.estimated_value ?? null,
        currency: infoDraft.currency || "USD",
      }) !==
        JSON.stringify({
          first_name: client.first_name || "",
          last_name: client.last_name || "",
          company: client.company || "",
          email: client.email || "",
          phone: client.phone || "",
          tax_id: client.tax_id || "",
          street: client.street || "",
          street2: client.street2 || "",
          city: client.city || "",
          state: client.state || "",
          postal_code: client.postal_code || "",
          country: client.country || "",
          lead_source: client.lead_source || "",
          estimated_value: client.estimated_value ?? null,
          currency: client.currency || "USD",
        });
    const notesDirty = notesDraft !== (client.notes || "");
    const followUpDraftDirty = !!newFollowUpTitle.trim() || !!newFollowUpDueAt;
    const tagDraftDirty = isAddingTag && !!newTag.trim();
    const followUpEditDirty = !!editingFollowUpId;
    return infoDirty || notesDirty || followUpDraftDirty || tagDraftDirty || followUpEditDirty;
  }, [client, editingFollowUpId, editingInfo, infoDraft, isAddingTag, newFollowUpDueAt, newFollowUpTitle, newTag, notesDraft]);
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
        const [{ data: c, error: cErr }, { data: p }, { data: inv }, { data: prop }, { data: ctr }, { data: appr }, { data: fu }, { data: profile }] = await Promise.all([
          supabase.from("clients").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
          supabase.from("projects").select("id, name, status, due_date, budget").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("invoices").select("id, invoice_number, status, total, due_date").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("proposals").select("id, identifier, status, total, expires_at").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("contracts").select("id, identifier, status, total").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("review_requests").select("id, title, status, created_at, project_id, projects(name)").eq("client_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("client_follow_ups").select("id, title, due_at, completed_at").eq("client_id", id).order("created_at", { ascending: false }),
          supabase.from("profiles").select("date_format").eq("user_id", user.id).maybeSingle(),
        ]);

        if (cErr) throw cErr;
        const loadedClient = (c as Client) || null;
        setClient(loadedClient);
        setNotesDraft(loadedClient?.notes || "");
        setInfoDraft(loadedClient || {});
        setProjects((p || []) as Project[]);
        setInvoices((inv || []) as Invoice[]);
        setProposals((prop || []) as Proposal[]);
        setContracts((ctr || []) as Contract[]);
        setApprovals((appr || []) as Approval[]);
        setFollowUps((fu || []) as FollowUp[]);
        setDateFormatPreference((profile as { date_format?: string | null } | null)?.date_format || "MM/DD/YYYY");

        const projectIds = ((p || []) as Project[]).map((row) => row.id);
        if (projectIds.length > 0) {
          const { data: te } = await supabase
            .from("time_entries")
            .select("id, project_id, task_id, description, started_at, start_time, total_duration_seconds, duration_minutes, projects(name), tasks(title)")
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

  const range = useMemo(() => {
    if (timeView === "week") {
      return {
        start: startOfWeek(timeAnchor, { weekStartsOn: 1 }),
        end: endOfWeek(timeAnchor, { weekStartsOn: 1 }),
      };
    }
    return { start: startOfMonth(timeAnchor), end: endOfMonth(timeAnchor) };
  }, [timeAnchor, timeView]);

  const days = useMemo(() => eachDayOfInterval(range), [range.start, range.end]);
  const dayKeys = useMemo(() => days.map((d) => format(d, "yyyy-MM-dd")), [days]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, { projectName: string; taskName: string; notes: string; byDay: Record<string, number> }>();
    timeEntries.forEach((entry) => {
      const dateStr = entry.started_at || entry.start_time;
      if (!dateStr) return;
      const d = parseISO(dateStr);
      if (d < range.start || d > range.end) return;
      const keyDay = format(d, "yyyy-MM-dd");
      const projectName = entry.projects?.name || "No project";
      const taskName = entry.tasks?.title || "No task";
      const notes = entry.description || "";
      const key = `${entry.project_id || "none"}::${entry.task_id || "none"}::${notes}`;
      if (!map.has(key)) map.set(key, { projectName, taskName, notes, byDay: {} });
      const row = map.get(key)!;
      row.byDay[keyDay] = (row.byDay[keyDay] || 0) + toSeconds(entry);
    });
    return Array.from(map.values());
  }, [timeEntries, range.start, range.end]);

  const dayTotals = useMemo(() => {
    const out: Record<string, number> = {};
    groupedRows.forEach((row) => {
      dayKeys.forEach((k) => {
        out[k] = (out[k] || 0) + (row.byDay[k] || 0);
      });
    });
    return out;
  }, [groupedRows, dayKeys]);

  const deleteClient = async () => {
    if (!client || !window.confirm("Delete this client? This action cannot be undone.")) return;
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) {
      toast({ title: "Failed to delete client", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Client deleted" });
    navigate("/clients");
  };

  const saveClientInfo = async () => {
    if (!client) return;
    const firstName = (infoDraft.first_name || "").trim();
    const lastName = (infoDraft.last_name || "").trim();
    const fallbackName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const payload = {
      first_name: firstName || null,
      last_name: lastName || null,
      name: fallbackName || infoDraft.name || client.name,
      company: infoDraft.company || null,
      email: infoDraft.email || null,
      phone: infoDraft.phone || null,
      tax_id: infoDraft.tax_id || null,
      street: infoDraft.street || null,
      street2: infoDraft.street2 || null,
      city: infoDraft.city || null,
      state: infoDraft.state || null,
      postal_code: infoDraft.postal_code || null,
      country: infoDraft.country || null,
      lead_source: infoDraft.lead_source || null,
      estimated_value: infoDraft.estimated_value != null ? Number(infoDraft.estimated_value) : null,
      currency: infoDraft.currency || "USD",
    };
    const { error, data } = await supabase.from("clients").update(payload).eq("id", client.id).select("*").single();
    if (error) {
      toast({ title: "Failed to save client info", description: error.message, variant: "destructive" });
      return;
    }
    setClient(data as Client);
    setInfoDraft(data as Client);
    setEditingInfo(false);
    toast({ title: "Client information updated" });
  };

  const saveNotes = async () => {
    if (!client) return;
    const { error, data } = await supabase.from("clients").update({ notes: notesDraft || null }).eq("id", client.id).select("*").single();
    if (error) {
      toast({ title: "Failed to save notes", description: error.message, variant: "destructive" });
      return;
    }
    setClient(data as Client);
    toast({ title: "Notes saved" });
  };

  const saveStage = async (stage: string) => {
    if (!client || stage === (client.status || "active")) return;
    const { error, data } = await supabase.from("clients").update({ status: stage }).eq("id", client.id).select("*").single();
    if (error) {
      toast({ title: "Failed to update CRM stage", description: error.message, variant: "destructive" });
      return;
    }
    setClient(data as Client);
    setInfoDraft(data as Client);
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
    setInfoDraft(data as Client);
    setIsAddingTag(false);
    setNewTag("");
  };

  const saveAllPending = async () => {
    if (editingInfo) await saveClientInfo();
    if (client && notesDraft !== (client.notes || "")) await saveNotes();
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
    setInfoDraft(data as Client);
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

  const toDateFnsPattern = (pattern: string) =>
    pattern.replace(/YYYY/g, "yyyy").replace(/DD/g, "dd").replace(/\bD\b/g, "d");

  const formatUserDate = (value: string | null | undefined, includeTime = false) => {
    if (!value) return "—";
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return includeTime
      ? `${format(parsed, toDateFnsPattern(dateFormatPreference))} ${format(parsed, "HH:mm")}`
      : format(parsed, toDateFnsPattern(dateFormatPreference));
  };

  if (loading) return <AppLayout><div className="text-sm text-muted-foreground">Loading client...</div></AppLayout>;
  if (!client) return <AppLayout><div className="text-sm text-muted-foreground">Client not found.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <Link to="/clients" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to clients
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button">
                    <Badge variant="outline" className={getClientStatusColor(client.status)}>{getClientStageLabel(client.status)}</Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {CRM_STAGES.map((stage) => (
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
            <Button variant="outline" disabled>Client Portal</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={deleteClient}>Delete Client</DropdownMenuItem>
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
                    <Button variant="outline" onClick={() => { setEditingInfo(false); setInfoDraft(client || {}); }}>Cancel</Button>
                    <Button onClick={saveClientInfo}>Save</Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setEditingInfo(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {editingInfo ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1"><Label>First name</Label><Input value={infoDraft.first_name || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, first_name: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Last name</Label><Input value={infoDraft.last_name || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, last_name: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Company</Label><Input value={infoDraft.company || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, company: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Email</Label><Input value={infoDraft.email || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, email: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Phone</Label><Input value={infoDraft.phone || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, phone: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Tax ID</Label><Input value={infoDraft.tax_id || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, tax_id: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Street</Label><Input value={infoDraft.street || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, street: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Street 2</Label><Input value={infoDraft.street2 || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, street2: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>City</Label><Input value={infoDraft.city || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, city: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>State</Label><Input value={infoDraft.state || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, state: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Postal code</Label><Input value={infoDraft.postal_code || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, postal_code: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Country</Label><Input value={infoDraft.country || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, country: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Lead source</Label><Input value={infoDraft.lead_source || ""} onChange={(e) => setInfoDraft((p) => ({ ...p, lead_source: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Currency</Label><Input value={infoDraft.currency || "USD"} onChange={(e) => setInfoDraft((p) => ({ ...p, currency: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Estimated value</Label><Input type="number" step="0.01" value={infoDraft.estimated_value ?? ""} onChange={(e) => setInfoDraft((p) => ({ ...p, estimated_value: e.target.value ? Number(e.target.value) : null }))} /></div>
                  </div>
                ) : (
                  <>
                    <p><strong>Company:</strong> {client.company || "—"}</p>
                    <p><strong>Email:</strong> {client.email || "—"}</p>
                    <p><strong>Phone:</strong> {client.phone || "—"}</p>
                    <p><strong>Tax ID:</strong> {client.tax_id || "—"}</p>
                    <p><strong>Currency:</strong> {client.currency || "USD"}</p>
                    <p><strong>Address:</strong> {[client.street, client.street2, client.city, client.state, client.postal_code, client.country].filter(Boolean).join(", ") || "—"}</p>
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
                  </>
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

            <Card>
              <CardHeader><CardTitle className="text-base font-semibold">Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={5} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Add notes about this client..." />
                <div className="flex justify-end">
                  <Button onClick={saveNotes}>Save Notes</Button>
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
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTimeAnchor((d) => (timeView === "week" ? subWeeks(d, 1) : subMonths(d, 1)))}>Previous</Button>
                <Button variant="outline" onClick={() => setTimeAnchor((d) => (timeView === "week" ? addWeeks(d, 1) : addMonths(d, 1)))}>Next</Button>
              </div>
              <div className="flex gap-2">
                <Button variant={timeView === "week" ? "default" : "outline"} onClick={() => setTimeView("week")}>Week</Button>
                <Button variant={timeView === "month" ? "default" : "outline"} onClick={() => setTimeView("month")}>Month</Button>
              </div>
            </div>
            <Card><CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project / Task</TableHead>
                    {days.map((day) => <TableHead key={day.toISOString()}>{format(day, timeView === "week" ? "EEE d" : "d")}</TableHead>)}
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.map((row, idx) => {
                    const rowTotal = dayKeys.reduce((sum, k) => sum + (row.byDay[k] || 0), 0);
                    return (
                      <TableRow key={`${row.projectName}-${row.taskName}-${idx}`}>
                        <TableCell>
                          <div className="font-medium">{row.projectName}</div>
                          <div className="text-xs text-muted-foreground">{row.taskName}</div>
                        </TableCell>
                        {dayKeys.map((k) => <TableCell key={k} className="font-mono">{row.byDay[k] ? formatHm(row.byDay[k]) : "—"}</TableCell>)}
                        <TableCell className="font-mono font-medium">{formatHm(rowTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    {dayKeys.map((k) => <TableCell key={k} className="font-mono font-semibold">{dayTotals[k] ? formatHm(dayTotals[k]) : "—"}</TableCell>)}
                    <TableCell className="font-mono font-semibold">{formatHm(Object.values(dayTotals).reduce((s, v) => s + v, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent></Card>
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

