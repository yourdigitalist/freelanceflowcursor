import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_STORAGE_BYTES = 200 * 1024 * 1024;
const PAYMENT_METHOD_OPTIONS = [
  "bank transfer",
  "credit card",
  "debit card",
  "paypal",
  "stripe",
  "crypto",
  "other",
];

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useProfileCurrency();
  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [businessEmail, setBusinessEmail] = useState<string | null>(null);
  const [businessPhone, setBusinessPhone] = useState<string | null>(null);
  const [coverSignedUrl, setCoverSignedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("data");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveInFlightRef = useRef(false);

  const load = async () => {
    if (!id) return;
    const [{ data: p }, { data: s }, { data: svc }, { data: profile }, { data: allClients }, { data: allProjects }] = await Promise.all([
      supabase.from("proposals").select("*, clients(name, company), projects(name)").eq("id", id).single(),
      supabase.from("proposal_services").select("*").eq("proposal_id", id).order("position"),
      supabase.from("services").select("*").order("name"),
      user ? supabase.from("profiles").select("business_name, business_logo, business_email, business_phone").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("projects").select("id, name, client_id").order("name"),
    ]);
    const paymentMethods = Array.isArray(p?.payment_methods) ? p.payment_methods : [];
    const otherMethod = paymentMethods.find((method: string) => method.startsWith("other:"));
    setProposal({
      ...p,
      payment_methods: otherMethod ? [...paymentMethods.filter((method: string) => !method.startsWith("other:")), "other"] : paymentMethods,
      payment_other: otherMethod ? otherMethod.replace(/^other:\s*/i, "") : "",
    });
    setItems((s || []).map((x: any) => ({ ...x, price: Number(x.price || 0), quantity: Number(x.quantity || 1), line_total: Number(x.line_total || 0) })));
    setServices(svc || []);
    setClients((allClients || []) as any);
    setProjects((allProjects || []) as any);
    setProjectNameInput(p?.projects?.name || "");
    setBusinessName(profile?.business_name || null);
    setBusinessLogo(profile?.business_logo || null);
    setBusinessEmail(profile?.business_email || null);
    setBusinessPhone(profile?.business_phone || null);
    if (p?.cover_image_url) {
      const { data: signed } = await supabase.storage.from("proposal-images").createSignedUrl(p.cover_image_url, 3600);
      setCoverSignedUrl(signed?.signedUrl || null);
    } else {
      setCoverSignedUrl(null);
    }
  };

  useEffect(() => {
    void load();
  }, [id, user?.id]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0), [items]);
  const discount = useMemo(() => {
    if (!proposal) return 0;
    return proposal.discount_type === "percent" ? subtotal * ((Number(proposal.discount_value) || 0) / 100) : Number(proposal.discount_value || 0);
  }, [proposal, subtotal]);
  const total = Math.max(0, subtotal - discount);
  const expiryPreview = useMemo(() => {
    if (!proposal?.validity_days) return null;
    const d = new Date();
    d.setDate(d.getDate() + Number(proposal.validity_days || 0));
    return d.toLocaleDateString();
  }, [proposal?.validity_days]);

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
    (proposal?.payment_structure !== "installments" || Boolean(String(proposal?.installment_description || "").trim()));
  const hasRequiredData = Boolean(
    proposal?.identifier &&
    String(proposal?.presentation || "").trim() &&
    String(proposal?.objective || "").trim()
  );

  const getRequiredFieldErrors = () => {
    const errors: string[] = [];
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
          currency: item.currency || currency || "USD",
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
      const payload = {
        identifier: proposal.identifier,
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
    if (nextTab !== activeTab) {
      if (saveInFlightRef.current) return;
      const ok = await save(false, true, false);
      if (!ok) return;
      setActiveTab(nextTab);
    }
  };

  const discountDisplayText = proposal?.discount_type === "percent"
    ? `$${discount.toFixed(2)} (${Number(proposal.discount_value || 0)}%)`
    : `$${discount.toFixed(2)}`;
  const tabCompletion = {
    data: hasRequiredData,
    services: hasRequiredService,
    conditions: hasRequiredConditions,
    preview: hasRequiredData && hasRequiredService && hasRequiredConditions,
  };
  const filteredProjects = projects.filter((project) => !proposal?.client_id || project.client_id === proposal.client_id);

  if (!proposal) return <AppLayout><div className="text-sm text-muted-foreground">Loading proposal...</div></AppLayout>;

  const formatStatus = (status: string) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft";
  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-success/10 text-success border-success/20";
      case "read":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "sent":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "draft":
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/proposals" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
            <h1 className="mt-2 text-2xl font-bold">{proposal.identifier}</h1>
            <Badge variant="outline" className={statusBadgeClass(proposal.status)}>
              {formatStatus(proposal.status)}
            </Badge>
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
                  <Label>Client</Label>
                  <Select
                    value={proposal.client_id || ""}
                    onValueChange={(value) => {
                      const nextProjects = projects.filter((project) => project.client_id === value);
                      updateProposal({
                        client_id: value,
                        project_id: proposal.project_id && nextProjects.some((project) => project.id === proposal.project_id)
                          ? proposal.project_id
                          : null,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
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
                      updateProposal({ project_id: nextProjectId });
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
                  <p className="text-xs text-muted-foreground">Pick an existing project, or type a new name below and it will be created for this client when you save.</p>
                  <Input
                    value={projectNameInput}
                    onChange={(e) => {
                      setProjectNameInput(e.target.value);
                      updateProposal({ project_id: null });
                    }}
                    placeholder="Type a new project name"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Identifier</Label>
                <Input value={proposal.identifier || ""} onChange={(e) => updateProposal({ identifier: e.target.value })} />
                <p className="text-xs text-muted-foreground">The automatic proposal ID is active. You can use any text you prefer. You can disable this in Settings at any time.</p>
              </div>
              <div className="space-y-2">
                <Label>Cover image</Label>
                <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onCoverUpload(e.target.files[0])} />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload cover image
                  </Button>
                  {proposal.cover_image_url ? <Button variant="ghost" onClick={() => updateProposal({ cover_image_url: null })}>Remove</Button> : null}
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
                <div><Label>Validity period (days)</Label><Input type="number" value={proposal.validity_days || 30} onChange={(e) => updateProposal({ validity_days: Number(e.target.value || 0) })} /></div>
                <div><Label>Expiry preview</Label><Input value={expiryPreview || "—"} readOnly /></div>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="services">
            <Card><CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Services</h3>
                <p className="text-sm text-muted-foreground">List the services that will be delivered and add a discount.</p>
              </div>
              <div className="border-b" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCatalogOpen(true)}>Add from Service Catalog</Button>
                <Button variant="outline" onClick={() => setItems((prev) => [...prev, { id: createTempItemId(), name: "", description: "", price: 0, quantity: 1, line_total: 0, currency: currency || "USD", recurrence_period: "monthly", is_recurring: false }])}><Plus className="mr-2 h-4 w-4" />Add manually</Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id || `${item.service_id || "service"}-${idx}`} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12">
                    <Input className="md:col-span-3" value={item.name} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="Service name" />
                    <Input className="md:col-span-3" value={item.description || ""} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="Description" />
                    <Input className="md:col-span-2" type="number" value={item.price} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, price: Number(e.target.value || 0) } : x))} placeholder="Price" />
                    <Input className="md:col-span-2" type="number" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value || 1) } : x))} placeholder="Qty" />
                    <div className="md:col-span-2 flex items-center justify-between">
                      <span className="text-sm font-medium">${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div><Label>Discount type</Label><RadioGroup value={proposal.discount_type || "amount"} onValueChange={(value) => updateProposal({ discount_type: value })} className="flex gap-4 pt-2"><div className="flex items-center gap-2"><RadioGroupItem id="disc-amount" value="amount" /><Label htmlFor="disc-amount">Amount</Label></div><div className="flex items-center gap-2"><RadioGroupItem id="disc-percent" value="percent" /><Label htmlFor="disc-percent">Percent</Label></div></RadioGroup></div>
                <div><Label>Discount value</Label><Input type="number" value={proposal.discount_value || 0} onChange={(e) => updateProposal({ discount_value: Number(e.target.value || 0) })} /></div>
                <div className="space-y-1">
                  <p className="text-sm">Subtotal: ${subtotal.toFixed(2)}</p>
                  <p className="text-sm text-emerald-600">Discount: {discountDisplayText}</p>
                  <p className="font-semibold">Total: ${total.toFixed(2)}</p>
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
            {(!proposal.presentation || !proposal.objective) ? <div className="rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-2 text-sm text-amber-800">About You and Objective are required before sending.</div> : null}
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
            <div className="overflow-hidden rounded-xl border">
              <iframe
                title="Client proposal preview"
                src={`/proposal/${proposal.public_token}?preview=1`}
                className="h-[900px] w-full bg-white"
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
                        currency: s.currency || currency || "USD",
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
