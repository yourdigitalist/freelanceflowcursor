import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, Plus, Trash2, Upload } from "@/components/icons";
import { useProfileCurrency } from "@/hooks/useProfileCurrency";
import { useLocalePreferences } from "@/hooks/useLocalePreferences";
import { formatLocaleDate } from "@/lib/datetime";
import { proposalSnapshotsFromClientId } from "@/lib/clientLifecycle";
import {
  assignProposalIdentifierIfMissing,
  effectiveValidityDays,
  mergeProposalWithDefaults,
  normalizeProposalPaymentMethods,
  type ProposalProfileDefaults,
} from "@/lib/proposalDefaults";
import { ProposalDocument } from "@/components/proposals/ProposalDocument";

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_STORAGE_BYTES = 200 * 1024 * 1024;
type ProposalCreateState = {
  fromCreate?: boolean;
  clientId?: string;
  projectId?: string | null;
  client_name_snapshot?: string | null;
  client_company_snapshot?: string | null;
  clients?: { name: string; company: string | null; currency?: string | null } | null;
};

const PAYMENT_METHOD_OPTIONS = [
  "bank transfer",
  "credit card",
  "debit card",
  "paypal",
  "stripe",
  "crypto",
  "other",
];

async function fetchProposalRow(proposalId: string, attempt = 0): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*, clients(name, company, currency, logo_url), projects(name)")
    .eq("id", proposalId)
    .maybeSingle();
  if (data && !error) return { data: data as Record<string, unknown>, error: null };
  if (attempt < 4) {
    await new Promise((resolve) => window.setTimeout(resolve, 200 * (attempt + 1)));
    return fetchProposalRow(proposalId, attempt + 1);
  }
  return { data: null, error: error ?? new Error("Proposal not found") };
}

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const createState = (location.state as ProposalCreateState | null)?.fromCreate
    ? (location.state as ProposalCreateState)
    : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useProfileCurrency();
  const { dateFormat } = useLocalePreferences();
  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; company: string | null; currency?: string | null; archived_at?: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [showCreateProjectInput, setShowCreateProjectInput] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [businessEmail, setBusinessEmail] = useState<string | null>(null);
  const [businessPhone, setBusinessPhone] = useState<string | null>(null);
  const [proposalMainColor, setProposalMainColor] = useState<string | undefined>(undefined);
  const [coverSignedUrl, setCoverSignedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("data");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveInFlightRef = useRef(false);
  const skipAutosaveRef = useRef(true);
  const proposalLoadedRef = useRef(false);

  const load = async () => {
    if (!id) return;
    proposalLoadedRef.current = false;
    setLoadError(null);
    const [{ data: p, error: proposalError }, { data: s }, { data: svc }, { data: profile }, { data: allClients }, { data: allProjects }] = await Promise.all([
      fetchProposalRow(id),
      supabase.from("proposal_services").select("*").eq("proposal_id", id).order("position"),
      supabase.from("services").select("*").order("name"),
      user
        ? supabase
            .from("profiles")
            .select(
              "business_name, business_logo, business_email, business_phone, notification_preferences, proposal_default_cover_image_url, proposal_default_validity_days, proposal_default_immediate_availability, proposal_default_payment_structure, proposal_default_payment_methods, proposal_default_conditions_notes, proposal_default_installment_description",
            )
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from("clients").select("id, name, company, currency, archived_at").order("name"),
      supabase.from("projects").select("id, name, client_id").order("name"),
    ]);
    const defaults: ProposalProfileDefaults | null = profile
      ? {
          proposal_default_cover_image_url: profile.proposal_default_cover_image_url ?? null,
          proposal_default_validity_days: profile.proposal_default_validity_days ?? null,
          proposal_default_immediate_availability: profile.proposal_default_immediate_availability ?? null,
          proposal_default_payment_structure: profile.proposal_default_payment_structure ?? null,
          proposal_default_payment_methods: profile.proposal_default_payment_methods ?? null,
          proposal_default_conditions_notes: profile.proposal_default_conditions_notes ?? null,
          proposal_default_installment_description: profile.proposal_default_installment_description ?? null,
        }
      : null;
    let row = p;
    if (!row && createState?.clientId) {
      row = {
        id,
        client_id: createState.clientId,
        project_id: createState.projectId ?? null,
        client_name_snapshot: createState.client_name_snapshot ?? null,
        client_company_snapshot: createState.client_company_snapshot ?? null,
        clients: createState.clients ?? null,
        status: "draft",
        payment_methods: [],
      };
    }
    if (!row?.client_id) {
      setProposal(null);
      setLoadError(proposalError?.message || "Could not load proposal.");
      return;
    }

    let identifier = String(row.identifier || "").trim();
    if (!identifier && user?.id && id) {
      try {
        identifier = await assignProposalIdentifierIfMissing(id, user.id, row.identifier as string | null);
      } catch {
        /* keep empty; save will retry */
      }
    }
    const payment = normalizeProposalPaymentMethods(row.payment_methods as string[] | undefined);
    const merged = mergeProposalWithDefaults(
      {
        ...row,
        identifier: identifier || row.identifier,
        ...payment,
      },
      defaults,
    );
    setProposal(merged);
    proposalLoadedRef.current = true;
    if (createState?.fromCreate) {
      navigate(location.pathname, { replace: true, state: null });
    }
    setItems((s || []).map((x: any) => ({ ...x, price: Number(x.price || 0), quantity: Number(x.quantity || 1), line_total: Number(x.line_total || 0) })));
    setServices(svc || []);
    setClients((allClients || []) as any);
    setProjects((allProjects || []) as any);
    setProjectNameInput((row.projects as { name?: string } | null)?.name || "");
    setBusinessName(profile?.business_name || null);
    setBusinessLogo(profile?.business_logo || null);
    setBusinessEmail(profile?.business_email || null);
    setBusinessPhone(profile?.business_phone || null);
    const prefs = profile?.notification_preferences as { proposal_main_color?: string } | null;
    setProposalMainColor(prefs?.proposal_main_color || undefined);
    const coverPath = merged.cover_image_url || row.cover_image_url;
    if (coverPath) {
      const { data: signed } = await supabase.storage.from("proposal-images").createSignedUrl(coverPath, 3600);
      setCoverSignedUrl(signed?.signedUrl || null);
    } else {
      setCoverSignedUrl(null);
    }
  };

  useEffect(() => {
    setProposal(null);
    void load();
  }, [id, user?.id]);

  useEffect(() => {
    skipAutosaveRef.current = true;
    const timer = window.setTimeout(() => {
      skipAutosaveRef.current = false;
    }, 800);
    return () => window.clearTimeout(timer);
  }, [id]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0), [items]);
  const selectedClientCurrency = useMemo(
    () => clients.find((client) => client.id === proposal?.client_id)?.currency || null,
    [clients, proposal?.client_id],
  );
  const resolvedCurrency = selectedClientCurrency || currency || "USD";
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: resolvedCurrency }).format(amount || 0);
  const discount = useMemo(() => {
    if (!proposal) return 0;
    return proposal.discount_type === "percent" ? subtotal * ((Number(proposal.discount_value) || 0) / 100) : Number(proposal.discount_value || 0);
  }, [proposal, subtotal]);
  const total = Math.max(0, subtotal - discount);
  const expiresOnLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + effectiveValidityDays(proposal));
    return formatLocaleDate(d, dateFormat);
  }, [proposal?.validity_days, dateFormat]);

  const updateProposal = (patch: any) => setProposal((prev: any) => ({ ...prev, ...patch }));
  const createTempItemId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `temp-${crypto.randomUUID()}`
      : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const hasRequiredService = items.some((item) => String(item.name || "").trim().length > 0);
  const hasRequiredConditions =
    Boolean(proposal?.timeline_days) &&
    Boolean(proposal?.payment_structure) &&
    (proposal?.payment_methods || []).length > 0 &&
    (proposal?.payment_structure !== "installments" || Boolean(String(proposal?.installment_description || "").trim())) &&
    (!(proposal?.payment_methods || []).includes("other") || Boolean(String(proposal?.payment_other || "").trim()));
  const hasRequiredData = Boolean(
    proposal?.client_id &&
    String(proposal?.presentation || "").trim() &&
    String(proposal?.objective || "").trim(),
  );

  const getRequiredFieldErrors = () => {
    const errors: string[] = [];
    if (!proposal?.client_id) {
      errors.push("Client is required.");
    }
    if (!String(proposal?.presentation || "").trim()) {
      errors.push("About you is required.");
    }
    if (!String(proposal?.objective || "").trim()) {
      errors.push("Objective is required.");
    }
    if (!hasRequiredService) {
      errors.push("Add at least one service in the Services tab.");
    }
    if (!proposal?.timeline_days) {
      errors.push("Project duration is required.");
    }
    if (!proposal?.payment_structure) {
      errors.push("Payment structure is required.");
    }
    if (!(proposal?.payment_methods || []).length) {
      errors.push("Select at least one payment method.");
    }
    if (
      (proposal?.payment_methods || []).includes("other") &&
      !String(proposal?.payment_other || "").trim()
    ) {
      errors.push("Describe the other payment method.");
    }
    if (
      proposal?.payment_structure === "installments" &&
      !String(proposal?.installment_description || "").trim()
    ) {
      errors.push("Installment description is required for installments.");
    }
    return errors;
  };

  const persistServices = async () => {
    if (!id) return { ok: false };
    const insertRows = items
      .map((item, idx) => {
        const name = String(item.name || "").trim();
        if (!name) return null;
        return {
          proposal_id: id,
          service_id: item.service_id || null,
          name,
          description: item.description || null,
          price: Number(item.price || 0),
          currency: resolvedCurrency,
          is_recurring: !!item.is_recurring,
          recurrence_period: item.recurrence_period || "monthly",
          quantity: Number(item.quantity || 1),
          position: idx,
          line_total: Number(item.price || 0) * Number(item.quantity || 1),
        };
      })
      .filter(Boolean);
    const { error: deleteError } = await supabase.from("proposal_services").delete().eq("proposal_id", id);
    if (deleteError) return { ok: false, error: deleteError };
    if (insertRows.length) {
      const { error: insertError } = await supabase.from("proposal_services").insert(insertRows as any);
      if (insertError) return { ok: false, error: insertError };
    }
    return { ok: true };
  };

  const save = async (send = false, silent = false, skipServicesPersist = false) => {
    if (!proposal || !id) return false;
    if (saveInFlightRef.current) return false;
    if (send) {
      const requiredErrors = getRequiredFieldErrors();
      if (requiredErrors.length) {
        setSaveStatus("failed");
        setLastSaveError(requiredErrors[0]);
        if (!silent) {
          toast({
            title: "Missing required fields",
            description: requiredErrors[0],
            variant: "destructive",
          });
        }
        return false;
      }
    }
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    try {
      let resolvedProjectId: string | null = proposal.project_id || null;
      const trimmedProjectName = String(projectNameInput || "").trim();
      if (resolvedProjectId) {
        const selectedProject = projects.find((project) => project.id === resolvedProjectId);
        if (!selectedProject) {
          setSaveStatus("failed");
          setLastSaveError("Selected project could not be found.");
          if (!silent) toast({ title: "Invalid project", description: "Selected project could not be found.", variant: "destructive" });
          return false;
        }
        if (proposal.client_id && selectedProject.client_id !== proposal.client_id) {
          setSaveStatus("failed");
          setLastSaveError("Selected project is not linked to the selected client.");
          if (!silent) toast({ title: "Invalid project", description: "Please select a project linked to this client.", variant: "destructive" });
          return false;
        }
      }
      if (!resolvedProjectId && trimmedProjectName) {
        if (!proposal.client_id) {
          setSaveStatus("failed");
          setLastSaveError("Select a client before creating a new project.");
          if (!silent) toast({ title: "Client required", description: "Select a client before creating a project.", variant: "destructive" });
          return false;
        }
        const { data: createdProject, error: createProjectError } = await supabase
          .from("projects")
          .insert({
            user_id: user?.id,
            client_id: proposal.client_id,
            name: trimmedProjectName,
          } as any)
          .select("id, name, client_id")
          .single();
        if (createProjectError || !createdProject) {
          setSaveStatus("failed");
          setLastSaveError(createProjectError?.message || "Could not create project.");
          if (!silent) toast({ title: "Project creation failed", description: createProjectError?.message, variant: "destructive" });
          return false;
        }
        resolvedProjectId = createdProject.id;
        setProjects((prev) => [createdProject as any, ...prev]);
        setProposal((prev: any) => ({ ...prev, project_id: createdProject.id }));
      }

      const paymentMethodsForSave = (proposal.payment_methods || []).includes("other") && proposal.payment_other
        ? [...(proposal.payment_methods || []).filter((method: string) => method !== "other"), `other: ${proposal.payment_other}`]
        : (proposal.payment_methods || []).filter((method: string) => method !== "other");
      let identifier = String(proposal.identifier || "").trim();
      if (!identifier && user?.id) {
        identifier = await assignProposalIdentifierIfMissing(id, user.id, proposal.identifier);
        setProposal((prev: any) => ({ ...prev, identifier }));
      }
      const payload = {
        ...(identifier ? { identifier } : {}),
        objective: proposal.objective,
        presentation: proposal.presentation,
        validity_days: proposal.validity_days,
        cover_image_url: proposal.cover_image_url,
        subtotal,
        discount_type: proposal.discount_type,
        discount_value: proposal.discount_value,
        total,
        availability_required: proposal.availability_required,
        timeline_days: proposal.timeline_days,
        payment_structure: proposal.payment_structure,
        payment_methods: paymentMethodsForSave,
        client_id: proposal.client_id,
        client_name_snapshot: proposal.client_name_snapshot ?? null,
        client_company_snapshot: proposal.client_company_snapshot ?? null,
        project_id: resolvedProjectId,
        installment_description: proposal.installment_description || null,
        conditions_notes: proposal.conditions_notes,
        expires_at: proposal.validity_days ? new Date(Date.now() + Number(proposal.validity_days) * 86400000).toISOString().slice(0, 10) : null,
        status: send ? "sent" : proposal.status,
        sent_at: send ? new Date().toISOString() : proposal.sent_at,
      };
      const { error } = await supabase.from("proposals").update(payload).eq("id", id);
      if (error) {
        setSaveStatus("failed");
        setLastSaveError(error.message);
        if (!silent) toast({ title: "Error saving proposal", description: error.message, variant: "destructive" });
        return false;
      }

      if (!skipServicesPersist) {
        const servicesSaved = await persistServices();
        if (!servicesSaved.ok) {
          setSaveStatus("failed");
          setLastSaveError(servicesSaved.error?.message || "Could not save services");
          if (!silent) toast({ title: "Error saving services", description: servicesSaved.error?.message, variant: "destructive" });
          return false;
        }
      }
      if (send) {
        const { data: sendData, error: sendError } = await supabase.functions.invoke("send-proposal", {
          body: {
            proposalId: id,
            origin: window.location.origin,
          },
        });
        if (sendError || sendData?.error) {
          setSaveStatus("failed");
          setLastSaveError(sendData?.error || sendError?.message || "Failed to send proposal email");
          if (!silent) {
            toast({
              title: "Proposal saved but email failed",
              description: sendData?.error || sendError?.message || "Please try again.",
              variant: "destructive",
            });
          }
          return false;
        }
      }
      setSaveStatus("saved");
      setLastSaveError(null);
      if (!silent) toast({ title: send ? "Proposal sent" : "Proposal saved" });
      await load();
      return true;
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const onCoverUpload = async (file: File) => {
    if (!user || !proposal) return;
    if (file.size > MAX_COVER_SIZE) return toast({ title: "File too large", description: "Max size is 10MB", variant: "destructive" });
    const { data: owned } = await supabase.storage.from("proposal-images").list(user.id, { limit: 200 });
    const currentBytes = (owned || []).reduce((sum: number, f: any) => sum + Number(f.metadata?.size || 0), 0);
    if (currentBytes + file.size > MAX_STORAGE_BYTES) {
      return toast({ title: "Storage limit reached", description: "Please remove files first.", variant: "destructive" });
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${proposal.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("proposal-images").upload(path, file, { upsert: true });
    if (uploadError) return toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
    updateProposal({ cover_image_url: path });
    const { data: signed } = await supabase.storage.from("proposal-images").createSignedUrl(path, 3600);
    setCoverSignedUrl(signed?.signedUrl || null);
  };

  const onTabChange = async (nextTab: string) => {
    if (nextTab === activeTab) return;
    if (nextTab !== "preview") {
      if (saveInFlightRef.current) return;
      const ok = await save(false, true, false);
      if (!ok) return;
    }
    setActiveTab(nextTab);
  };

  useEffect(() => {
    if (skipAutosaveRef.current || !proposalLoadedRef.current || !proposal?.client_id || !id) return;
    const timer = window.setTimeout(() => {
      void save(false, true, false);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [proposal, items, projectNameInput, id]);

  const discountDisplayText = proposal?.discount_type === "percent"
    ? `${formatMoney(discount)} (${Number(proposal.discount_value || 0)}%)`
    : formatMoney(discount);
  const tabCompletion = {
    data: hasRequiredData,
    services: hasRequiredService,
    conditions: hasRequiredConditions,
    preview: hasRequiredData && hasRequiredService && hasRequiredConditions,
  };
  const filteredProjects = projects.filter((project) => !proposal?.client_id || project.client_id === proposal.client_id);
  const clientSelectOptions = useMemo(() => {
    const active = clients.filter((client) => !client.archived_at || client.id === proposal?.client_id);
    if (proposal?.client_id && !active.some((client) => client.id === proposal.client_id)) {
      const linked = (proposal.clients as { name?: string; company?: string | null; currency?: string | null } | null) || null;
      if (linked?.name) {
        return [
          {
            id: proposal.client_id,
            name: linked.name,
            company: linked.company ?? null,
            currency: linked.currency ?? null,
          },
          ...active,
        ];
      }
    }
    return active;
  }, [clients, proposal?.client_id, proposal?.clients]);

  if (!proposal) {
    return (
      <AppLayout>
        <div className="text-sm text-muted-foreground">
          {loadError || "Loading proposal..."}
        </div>
      </AppLayout>
    );
  }

  const formatStatus = (status: string) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft";
  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-success/10 text-success border-success/20";
      case "read":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "sent":
        return "bg-warning/10 text-warning border-warning/20";
      case "draft":
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <Link to="/proposals" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Proposals
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <h1 className="text-2xl font-bold">{proposal.identifier || "Draft proposal"}</h1>
              <Badge variant="outline" className={statusBadgeClass(proposal.status)}>
                {formatStatus(proposal.status)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "failed" && (
                <button type="button" className="underline" onClick={() => void save(false, true)}>
                  Save failed - retry
                </button>
              )}
            </p>
            {saveStatus === "failed" && lastSaveError ? (
              <p className="mt-1 text-xs text-destructive">{lastSaveError}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)}>Save Changes</Button>
            <Button onClick={() => save(true)}>Save and Send</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => void onTabChange(value)} className="space-y-4">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            {[
              { value: "data", label: "Details", done: tabCompletion.data },
              { value: "services", label: "Services", done: tabCompletion.services },
              { value: "conditions", label: "Conditions", done: tabCompletion.conditions },
              { value: "preview", label: "Preview", done: tabCompletion.preview },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent px-0 py-3 mr-6 text-[15px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <span>{tab.label}</span>
                {tab.done ? <CheckCircle className="ml-2 h-4 w-4 text-emerald-600" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="data">
            <Card><CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Details</h3>
                <p className="text-sm text-muted-foreground">General proposal information. Make your presentation stand out.</p>
              </div>
              <div className="border-b" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select
                    value={proposal.client_id || ""}
                    onValueChange={async (value) => {
                      const selectedClient = clients.find((client) => client.id === value);
                      const nextProjects = projects.filter((project) => project.client_id === value);
                      let snapshots = { client_name_snapshot: null as string | null, client_company_snapshot: null as string | null };
                      try {
                        snapshots = await proposalSnapshotsFromClientId(value);
                      } catch {
                        /* keep existing snapshots on failure */
                      }
                      const keepProject =
                        proposal.project_id && nextProjects.some((project) => project.id === proposal.project_id);
                      const selectedProject = keepProject
                        ? nextProjects.find((project) => project.id === proposal.project_id)
                        : null;
                      updateProposal({
                        client_id: value,
                        ...snapshots,
                        clients: selectedClient
                          ? { name: selectedClient.name, company: selectedClient.company, currency: selectedClient.currency }
                          : null,
                        project_id: keepProject ? proposal.project_id : null,
                        projects: selectedProject ? { name: selectedProject.name } : null,
                      });
                      if (!keepProject) {
                        setProjectNameInput("");
                        setShowCreateProjectInput(false);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientSelectOptions.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company ? `${client.name} — ${client.company}` : `${client.name} — Individual`}
                          {client.archived_at ? " (Archived)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={proposal.project_id || "none"}
                    onValueChange={(value) => {
                      const nextProjectId = value === "none" ? null : value;
                      const selectedProject = filteredProjects.find((project) => project.id === nextProjectId);
                      setProjectNameInput(selectedProject?.name || "");
                      setShowCreateProjectInput(false);
                      updateProposal({
                        project_id: nextProjectId,
                        projects: selectedProject ? { name: selectedProject.name } : null,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setShowCreateProjectInput((prev) => !prev);
                        updateProposal({ project_id: null });
                      }}
                    >
                      + Add project
                    </Button>
                    {showCreateProjectInput ? (
                      <>
                        <p className="text-xs text-muted-foreground">Type a new project name and it will be created for this client when you save.</p>
                        <Input
                          value={projectNameInput}
                          onChange={(e) => {
                            setProjectNameInput(e.target.value);
                            updateProposal({ project_id: null });
                          }}
                          placeholder="Project name"
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Proposal identifier</Label>
                <Input value={proposal.identifier || ""} onChange={(e) => updateProposal({ identifier: e.target.value })} />
                <p className="text-xs text-muted-foreground">The automatic proposal ID is active. You can use any text you prefer. You can disable this in Settings at any time.</p>
              </div>
              <div className="space-y-2">
                <Label>Cover image</Label>
                {coverSignedUrl ? (
                  <img src={coverSignedUrl} alt="" className="h-36 w-full max-w-2xl rounded-lg border object-cover" />
                ) : null}
                <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onCoverUpload(e.target.files[0])} />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload cover image
                  </Button>
                  {proposal.cover_image_url ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        updateProposal({ cover_image_url: null });
                        setCoverSignedUrl(null);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">Choose an image related to the project to increase the visual appeal of your proposal. Recommended upload: 1500 x 500px (3:1 ratio). The visible area may crop slightly depending on screen size.</p>
              </div>
              <div className="space-y-1">
                <Label>About You *</Label>
                <Textarea value={proposal.presentation || ""} onChange={(e) => updateProposal({ presentation: e.target.value })} />
                <p className="text-xs text-muted-foreground">Tell the client who you are and why you're the right fit for this project.</p>
              </div>
              <div className="space-y-1">
                <Label>Objective *</Label>
                <Textarea value={proposal.objective || ""} onChange={(e) => updateProposal({ objective: e.target.value })} />
                <p className="text-xs text-muted-foreground">What is the client trying to achieve? Describe the goal this project will solve.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Validity period (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={effectiveValidityDays(proposal)}
                    onChange={(e) => updateProposal({ validity_days: Math.max(1, Number(e.target.value || 30)) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Expires on</Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{expiresOnLabel}</p>
                  <p className="text-xs text-muted-foreground">Calculated from the validity period above.</p>
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="services">
            <Card><CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Services *</h3>
                <p className="text-sm text-muted-foreground">List the services that will be delivered and add a discount.</p>
              </div>
              <div className="border-b" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCatalogOpen(true)}>Add from Service Catalog</Button>
                <Button variant="outline" onClick={() => setItems((prev) => [...prev, { id: createTempItemId(), name: "", description: "", price: 0, quantity: 1, line_total: 0, currency: resolvedCurrency, recurrence_period: "monthly", is_recurring: false }])}><Plus className="mr-2 h-4 w-4" />Add manually</Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id || `${item.service_id || "service"}-${idx}`} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12">
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs text-muted-foreground">Item</Label>
                      <Input value={item.name} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="Service name" />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Input value={item.description || ""} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="Description" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Unit price</Label>
                      <Input type="number" value={item.price} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, price: Number(e.target.value || 0) } : x))} placeholder="0.00" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value || 1) } : x))} placeholder="1" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Total</Label>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-medium">{formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}</span>
                        <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div><Label>Discount type</Label><RadioGroup value={proposal.discount_type || "amount"} onValueChange={(value) => updateProposal({ discount_type: value })} className="flex gap-4 pt-2"><div className="flex items-center gap-2"><RadioGroupItem id="disc-amount" value="amount" /><Label htmlFor="disc-amount">Amount</Label></div><div className="flex items-center gap-2"><RadioGroupItem id="disc-percent" value="percent" /><Label htmlFor="disc-percent">Percent</Label></div></RadioGroup></div>
                <div><Label>Discount value</Label><Input type="number" value={proposal.discount_value || 0} onChange={(e) => updateProposal({ discount_value: Number(e.target.value || 0) })} /></div>
                <div className="space-y-1">
                  <p className="text-sm">Subtotal: {formatMoney(subtotal)}</p>
                  <p className="text-sm text-emerald-600">Discount: {discountDisplayText}</p>
                  <p className="font-semibold">Total: {formatMoney(total)}</p>
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="conditions">
            <Card><CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Conditions</h3>
                <p className="text-sm text-muted-foreground">Describe delivery timeline and payment conditions for this service.</p>
              </div>
              <div className="border-b" />
              <div className="flex items-center gap-3"><Checkbox checked={proposal.availability_required} onCheckedChange={(v) => updateProposal({ availability_required: !!v })} id="availability" /><Label htmlFor="availability">I have immediate availability</Label></div>
              <div><Label>Project Duration (days) *</Label><Input type="number" value={proposal.timeline_days || ""} onChange={(e) => updateProposal({ timeline_days: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Payment structure *</Label><RadioGroup value={proposal.payment_structure || ""} onValueChange={(v) => updateProposal({ payment_structure: v })} className="flex gap-4 pt-2"><div className="flex items-center gap-2"><RadioGroupItem value="upfront" id="upfront" /><Label htmlFor="upfront">Upfront</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="installments" id="inst" /><Label htmlFor="inst">Installments</Label></div></RadioGroup></div>
              {proposal.payment_structure === "installments" ? (
                <div className="space-y-1">
                  <Label>Installment Description *</Label>
                  <Textarea value={proposal.installment_description || ""} onChange={(e) => updateProposal({ installment_description: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Describe how payments will be split. E.g. '50% upfront, 50% on delivery'.</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Payment methods *</Label>
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <div className="flex items-center gap-2" key={m}>
                    <Checkbox checked={(proposal.payment_methods || []).includes(m)} onCheckedChange={(checked) => updateProposal({ payment_methods: checked ? [...(proposal.payment_methods || []), m] : (proposal.payment_methods || []).filter((x: string) => x !== m) })} id={`pm-${m}`} />
                    <Label htmlFor={`pm-${m}`}>{m.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</Label>
                  </div>
                ))}
                {(proposal.payment_methods || []).includes("other") ? (
                  <Input placeholder="Other payment method" value={proposal.payment_other || ""} onChange={(e) => updateProposal({ payment_other: e.target.value })} />
                ) : null}
              </div>
              <div><Label>Notes (optional)</Label><Textarea value={proposal.conditions_notes || ""} onChange={(e) => updateProposal({ conditions_notes: e.target.value })} /></div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Proposal Preview</h3>
                <p className="text-sm text-muted-foreground">See exactly how your client will view your proposal and get ready to send it.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/proposal/${proposal.public_token}`);
                  toast({ title: "Link copied" });
                }}
              >
                Copy proposal link
              </Button>
              <Button variant="outline" onClick={() => window.open(`/proposal/${proposal.public_token}?preview=1`, "_blank", "noopener,noreferrer")}>
                Open client view
              </Button>
              <Button onClick={() => save(true)}>Save and Send</Button>
            </div>
            <div className="max-h-[min(70vh,900px)] overflow-y-auto rounded-xl border bg-background">
              <ProposalDocument
                proposal={{
                  ...proposal,
                  subtotal,
                  projects:
                    proposal.projects ||
                    (proposal.project_id
                      ? { name: filteredProjects.find((p) => p.id === proposal.project_id)?.name || projectNameInput || null }
                      : projectNameInput.trim()
                        ? { name: projectNameInput.trim() }
                        : null),
                }}
                items={items.map((item) => ({
                  ...item,
                  line_total: Number(item.price || 0) * Number(item.quantity || 0),
                  currency: item.currency || resolvedCurrency,
                }))}
                business={{
                  business_name: businessName,
                  business_logo: businessLogo,
                  business_email: businessEmail,
                  notification_preferences: proposalMainColor ? { proposal_main_color: proposalMainColor } : null,
                }}
                coverImageUrl={coverSignedUrl}
                proposalMainColor={proposalMainColor}
                showAcceptActions={false}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select services</DialogTitle></DialogHeader>
          <div className="max-h-96 space-y-2 overflow-auto">
            {services.map((s) => (
              <button
                key={s.id}
                className="w-full rounded-lg border p-3 text-left hover:bg-muted/50"
                onClick={() =>
                  setItems((prev) => {
                    const alreadyAdded = prev.some((item) => item.service_id === s.id);
                    if (alreadyAdded) {
                      toast({ title: "Service already added", description: "Edit quantity in the list if needed." });
                      return prev;
                    }
                    return [
                      ...prev,
                      {
                        id: createTempItemId(),
                        service_id: s.id,
                        name: s.name,
                        description: s.description,
                        price: Number(s.price || 0),
                        quantity: 1,
                        line_total: Number(s.price || 0),
                        currency: resolvedCurrency,
                        is_recurring: !!s.is_recurring,
                        recurrence_period: s.recurrence_period || "monthly",
                      },
                    ];
                  })
                }
              >
                <p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground">{s.description || "No description"}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
