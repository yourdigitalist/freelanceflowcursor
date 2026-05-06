import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, FileText } from "@/components/icons";
import { SlotIcon } from "@/contexts/IconSlotContext";
import { DEFAULT_CONTRACT_TEMPLATE_CONTENT } from "@/lib/contractTemplate";

type ContractRow = {
  id: string;
  identifier: string;
  status: string;
  total: number;
  client_id: string | null;
  project_id: string | null;
  clients: { name: string } | null;
  projects: { name: string } | null;
};

type ProposalCandidate = {
  id: string;
  identifier: string;
};
type TemplateCandidate = { id: string; name: string; is_default: boolean | null };
type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  is_default: boolean | null;
};

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; company: string | null; email: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null; tax_id: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);
  const [proposalCandidates, setProposalCandidates] = useState<ProposalCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "pending_signatures" | "signed" | "cancelled">("all");
  const [selectedProposalId, setSelectedProposalId] = useState<string>("none");
  const [activeTab, setActiveTab] = useState<"contracts" | "templates">("contracts");
  const [templates, setTemplates] = useState<TemplateCandidate[]>([]);
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState<string>("none");
  const [templateDeleteId, setTemplateDeleteId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: contracts }, { data: allClients }, { data: allProjects }, { data: allTemplates }] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, identifier, status, total, client_id, project_id, clients(name), projects(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, company, email, phone, address, city, state, postal_code, country, tax_id").order("name"),
      supabase.from("projects").select("id, name, client_id").order("name"),
      supabase.from("contract_templates").select("id, name, description, content, is_default").order("created_at"),
    ]);
    setRows(((contracts || []) as ContractRow[]).map((row) => ({ ...row, total: Number(row.total || 0) })));
    setClients((allClients || []) as typeof clients);
    setProjects((allProjects || []) as typeof projects);
    const loadedTemplateRows = (allTemplates || []) as TemplateRow[];
    setTemplateRows(loadedTemplateRows);
    const loadedTemplates = loadedTemplateRows.map((row) => ({ id: row.id, name: row.name, is_default: row.is_default }));
    setTemplates(loadedTemplates);
    if (loadedTemplateRows.length === 0 && user) {
      const { data: inserted } = await supabase
        .from("contract_templates")
        .insert({
          user_id: user.id,
          name: "Service Agreement",
          description: "Standard English template for freelance services agreements.",
          content: DEFAULT_CONTRACT_TEMPLATE_CONTENT,
          is_default: true,
        } as never)
        .select("id, name, description, content, is_default")
        .single();
      if (inserted) {
        const newRow = inserted as TemplateRow;
        setTemplateRows([newRow]);
        setTemplates([{ id: newRow.id, name: newRow.name, is_default: newRow.is_default }]);
        setTemplateId(newRow.id);
        toast({ title: "Default template created", description: "A Standard Service Agreement template was added automatically." });
      }
      setLoading(false);
      return;
    }
    const defaultTemplate = loadedTemplates.find((row) => row.is_default) || loadedTemplates[0];
    setTemplateId(defaultTemplate?.id || "none");
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "templates") setActiveTab("templates");
  }, [searchParams]);

  useEffect(() => {
    const loadCandidates = async () => {
      if (projectId === "none") {
        setProposalCandidates([]);
        setSelectedProposalId("none");
        return;
      }
      const { data } = await supabase
        .from("proposals")
        .select("id, identifier")
        .eq("project_id", projectId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      setProposalCandidates((data || []) as ProposalCandidate[]);
      setSelectedProposalId("none");
    };
    void loadCandidates();
  }, [projectId]);

  const filteredProjects = useMemo(
    () => projects.filter((project) => !clientId || project.client_id === clientId),
    [projects, clientId],
  );

  const counts = useMemo(() => {
    const by = (status: string) => rows.filter((row) => row.status === status).length;
    return {
      draft: by("draft"),
      pending: by("pending_signatures"),
      signed: by("signed"),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;
      const matchesQuery = !query || [row.identifier, row.clients?.name || "", row.projects?.name || ""].join(" ").toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [rows, searchQuery, statusFilter]);

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-success/10 text-success border-success/20";
      case "pending_signatures":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "draft":
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatStatus = (status: string) =>
    status === "pending_signatures"
      ? "Pending signatures"
      : status.charAt(0).toUpperCase() + status.slice(1);

  const createContract = async () => {
    if (!user || !clientId || templateId === "none") return;
    const selectedClient = clients.find((client) => client.id === clientId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, business_name, business_phone, business_address, business_city, business_state, business_postal_code, business_country, business_street, business_street2, tax_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      user_id: user.id,
      client_id: clientId,
      project_id: projectId === "none" ? null : projectId,
      client_name: selectedClient?.name || null,
      client_company: selectedClient?.company || null,
      client_email: selectedClient?.email || null,
      client_phone: selectedClient?.phone || null,
      client_address: selectedClient?.address || null,
      client_city: selectedClient?.city || null,
      client_state: selectedClient?.state || null,
      client_zip: selectedClient?.postal_code || null,
      client_country: selectedClient?.country || null,
      client_tax_id: selectedClient?.tax_id || null,
      client_street: selectedClient?.address || null,
      client_street2: null,
      freelancer_name: profile?.full_name || null,
      freelancer_company: profile?.business_name || null,
      freelancer_email: profile?.email || null,
      freelancer_phone: profile?.business_phone || null,
      freelancer_address: profile?.business_address || null,
      freelancer_city: profile?.business_city || null,
      freelancer_state: profile?.business_state || null,
      freelancer_zip: profile?.business_postal_code || null,
      freelancer_country: profile?.business_country || null,
      freelancer_tax_id: profile?.tax_id || null,
      freelancer_street: profile?.business_street || profile?.business_address || null,
      freelancer_street2: profile?.business_street2 || null,
      payment_methods: [],
      template_id: templateId === "none" ? null : templateId,
    };

    const { data: contract, error } = await supabase
      .from("contracts")
      .insert(payload as never)
      .select("id")
      .single();

    if (error || !contract) {
      toast({ title: "Could not create contract", description: error?.message, variant: "destructive" });
      return;
    }

    if (selectedProposalId !== "none") {
      const [{ data: proposal }, { data: proposalItems }] = await Promise.all([
        supabase.from("proposals").select("*").eq("id", selectedProposalId).single(),
        supabase.from("proposal_services").select("*").eq("proposal_id", selectedProposalId).order("position"),
      ]);

      if (proposal) {
        await supabase
          .from("contracts")
          .update({
            proposal_id: proposal.id,
            timeline_days: proposal.timeline_days,
            immediate_availability: proposal.availability_required,
            payment_structure: proposal.payment_structure,
            installment_description: proposal.installment_description,
            payment_methods: proposal.payment_methods,
            additional_clause: proposal.conditions_notes,
            subtotal: proposal.subtotal,
            discount: proposal.discount_value,
            discount_type: proposal.discount_type === "amount" ? "fixed" : proposal.discount_type,
            total: proposal.total,
          } as never)
          .eq("id", contract.id);
      }

      if (proposalItems?.length) {
        await supabase.from("contract_services").insert(
          proposalItems.map((item, index) => ({
            contract_id: contract.id,
            service_id: item.service_id,
            name: item.name,
            description: item.description,
            price: item.price,
            quantity: Math.round(Number(item.quantity || 1)),
            sort_order: index,
          })) as never,
        );
      }
    }

    await supabase
      .from("clients")
      .update({ status: "Negotiation" } as never)
      .eq("id", clientId)
      .not("status", "in", "(Won,Active)");

    navigate(`/contracts/${contract.id}`);
  };

  const cancelContract = async () => {
    const reason = cancelReason.trim();
    if (!cancelId || !reason) return;
    const { data, error } = await supabase.functions.invoke("cancel-contract", {
      body: {
        contractId: cancelId,
        reason,
        origin: window.location.origin,
      },
    });
    if (error || data?.error) {
      toast({
        title: "Could not cancel contract",
        description: data?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    setCancelId(null);
    setCancelReason("");
    await load();
    toast({ title: "Contract cancelled", description: "Both parties were notified by email (if email is configured)." });
  };

  const openCreateTemplate = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("contract_templates")
      .insert({
        user_id: user.id,
        name: "Standard Service Agreement",
        description: "Standard English template for freelance services agreements.",
        content: DEFAULT_CONTRACT_TEMPLATE_CONTENT,
        is_default: false,
      } as never)
      .select("id")
      .single();
    if (error || !data?.id) {
      toast({ title: "Could not create template", description: error?.message, variant: "destructive" });
      return;
    }
    navigate(`/contracts/templates/${data.id}`);
  };

  const duplicateTemplate = async (id: string) => {
    if (!user) return;
    const row = templateRows.find((item) => item.id === id);
    if (!row) return;
    await supabase.from("contract_templates").insert({
      user_id: user.id,
      name: `Copy of ${row.name}`,
      description: row.description,
      content: row.content,
      is_default: false,
    } as never);
    await load();
  };

  const setTemplateDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("contract_templates").update({ is_default: false } as never).eq("user_id", user.id);
    await supabase.from("contract_templates").update({ is_default: true } as never).eq("id", id).eq("user_id", user.id);
    await load();
  };

  const deleteTemplate = async () => {
    if (!templateDeleteId) return;
    await supabase.from("contract_templates").delete().eq("id", templateDeleteId);
    setTemplateDeleteId(null);
    await load();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contracts</h1>
            <p className="text-muted-foreground">Create and sign professional contracts with clients.</p>
          </div>
          {activeTab === "contracts" ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Contract
            </Button>
          ) : (
            <Button onClick={openCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          )}
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const next = value as "contracts" | "templates";
            setActiveTab(next);
            setSearchParams(next === "templates" ? { tab: "templates" } : {});
          }}
          className="space-y-6"
        >
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="contracts" className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent">Contracts</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent">Contract Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="contracts" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[["Draft", counts.draft], ["Pending Signatures", counts.pending], ["Signed", counts.signed]].map(
            ([label, value]) => (
              <Card key={String(label)} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{String(label)}</p>
                  <p className="mt-1 text-2xl font-bold">{Number(value)}</p>
                </CardContent>
              </Card>
            ),
          )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Find a contract..."
            className="max-w-sm"
          />
          {(["all", "draft", "pending_signatures", "signed", "cancelled"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {formatStatus(status)}
            </Button>
          ))}
            </div>

            <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading contracts...</div>
            ) : filteredRows.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold">No contracts yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first contract to start working with clients professionally.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${row.id}`)}>
                      <TableCell className="font-medium">{row.identifier}</TableCell>
                      <TableCell>{row.clients?.name || "—"}</TableCell>
                      <TableCell>{row.projects?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(row.status)}>
                          {formatStatus(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
                          row.total || 0,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" asChild onClick={(event) => event.stopPropagation()} aria-label="Edit contract">
                            <Link to={`/contracts/${row.id}`}>
                              <SlotIcon slot="action_edit" className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); setCancelId(row.id); }}>
                            <SlotIcon slot="action_delete" className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="templates">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Loading templates...</div>
                ) : templateRows.length === 0 ? (
                  <div className="py-14 text-center">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold">No templates yet</h3>
                    <p className="text-sm text-muted-foreground">Create your first reusable contract template.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateRows.map((row) => (
                        <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/contracts/templates/${row.id}`)}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="max-w-[360px] truncate">{row.description || "—"}</TableCell>
                          <TableCell>{row.is_default ? <Badge variant="secondary">Default</Badge> : "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); navigate(`/contracts/templates/${row.id}`); }} aria-label="Edit template">
                                <SlotIcon slot="action_edit" className="h-4 w-4" />
                              </Button>
                              {!row.is_default ? <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); void setTemplateDefault(row.id); }}>Set default</Button> : null}
                              <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); void duplicateTemplate(row.id); }} aria-label="Duplicate template">
                                <SlotIcon slot="action_duplicate" className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setTemplateDeleteId(row.id); }} aria-label="Delete template"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
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
              <Label>Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
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
            </div>
            {proposalCandidates.length > 0 ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-medium">
                  We found an accepted proposal for this project. Would you like to import its data?
                </p>
                <div className="mt-2">
                  <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose accepted proposal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Do not import</SelectItem>
                      {proposalCandidates.map((proposal) => (
                        <SelectItem key={proposal.id} value={proposal.id}>
                          {proposal.identifier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Identifier</Label>
              <Input value="Generated on create" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Contract Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select a template before creating this contract.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createContract} disabled={!clientId || templateId === "none"}>
              Create Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!cancelId}
        onOpenChange={(open) => {
          if (!open) {
            setCancelId(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Cancel contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The contract will be cancelled immediately and all parties who have signed it will be notified.
              It will continue to exist, and everyone will still be able to access the data, but no further
              changes can be made.
            </p>
            <p>The project status will not be changed, since this action only applies at the contract level.</p>
            <p className="font-semibold text-destructive">Warning: this action is irreversible.</p>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason" className="text-foreground">
                Cancellation reason
              </Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Example 1: The project was paused due to non-payment and the client decided not to continue.

Example 2: Breach of Clause 9."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelId(null);
                setCancelReason("");
              }}
            >
              Close without cancelling
            </Button>
            <Button variant="destructive" onClick={cancelContract} disabled={!cancelReason.trim()}>
              Cancel contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!templateDeleteId} onOpenChange={(open) => !open && setTemplateDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteTemplate()}>Delete template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
