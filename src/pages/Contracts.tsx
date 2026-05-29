import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableFrame, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableClientCell } from "@/components/ui/table-client-cell";
import { TableStatusBadge } from "@/components/ui/table-status-badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PageSearchInput } from "@/components/ui/page-search-input";
import { EmptyValue } from "@/components/ui/empty-value";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Filter } from "@/components/icons";
import { SlotIcon } from "@/contexts/IconSlotContext";
import { applyProposalImportToContract } from "@/lib/contractProposalImport";
import { contractClientSnapshotFromClient } from "@/lib/clientForm";

import { LanceServiceAgreementDisclaimerDialog } from "@/components/contracts/LanceServiceAgreementDisclaimerDialog";
import { DEFAULT_CONTRACT_TEMPLATE_CONTENT } from "@/lib/contractTemplate";
import { useLanceServiceAgreementDisclaimer } from "@/hooks/useLanceServiceAgreementDisclaimer";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/ui/table-pagination";
import { PageSummaryBar, PageSummaryStat } from "@/components/ui/page-summary-stats";

type ContractRow = {
  id: string;
  identifier: string;
  status: string;
  total: number;
  client_id: string | null;
  project_id: string | null;
  clients: {
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_color?: string | null;
    logo_url?: string | null;
    currency?: string | null;
  } | null;
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
  const [clients, setClients] = useState<{ id: string; name: string; company: string | null; company_name: string | null; entity_type: string | null; company_registration: string | null; email: string | null; phone: string | null; address: string | null; street: string | null; street2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null; tax_id: string | null; currency?: string | null }[]>([]);
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
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const {
    disclaimerOpen,
    onDisclaimerOpenChange,
    onDisclaimerConfirm,
    requestAcceptance,
  } = useLanceServiceAgreementDisclaimer();

  const load = async () => {
    const [{ data: contracts }, { data: allClients }, { data: allProjects }, { data: allTemplates }] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, identifier, status, total, client_id, project_id, clients(name, first_name, last_name, avatar_color, logo_url, currency), projects(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, company, company_name, entity_type, company_registration, email, phone, address, street, street2, city, state, postal_code, country, tax_id, currency").is("archived_at", null).order("name"),
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
    const client = searchParams.get("client");
    const shouldOpen = searchParams.get("new") === "1" || !!client;
    if (!shouldOpen || clients.length === 0) return;
    if (client && clients.some((c) => c.id === client)) setClientId(client);
    setCreateOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, clients, setSearchParams]);

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
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;
  const contractsPagination = usePagination(filteredRows);
  const templatesPagination = usePagination(templateRows);

  const formatMoney = (amount: number, currencyCode?: string | null) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode || "USD" }).format(amount || 0);


  const handleCreateTemplateChange = async (nextTemplateId: string) => {
    const selected = templateRows.find((t) => t.id === nextTemplateId) || templates.find((t) => t.id === nextTemplateId);
    const accepted = await requestAcceptance(selected);
    if (!accepted) return;
    setTemplateId(nextTemplateId);
  };

  const createContract = async () => {
    if (!user || !clientId || templateId === "none") return;
    const selectedTemplate = templateRows.find((t) => t.id === templateId) || templates.find((t) => t.id === templateId);
    const accepted = await requestAcceptance(selectedTemplate);
    if (!accepted) return;
    const selectedClient = clients.find((client) => client.id === clientId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, business_name, business_phone, business_address, business_city, business_state, business_postal_code, business_country, business_street, business_street2, tax_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const clientSnapshot = selectedClient ? contractClientSnapshotFromClient(selectedClient) : {};
    const payload: Record<string, unknown> = {
      user_id: user.id,
      client_id: clientId,
      project_id: projectId === "none" ? null : projectId,
      ...clientSnapshot,
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
      try {
        await applyProposalImportToContract(contract.id, selectedProposalId);
      } catch (importError: unknown) {
        const message = importError instanceof Error ? importError.message : "Could not import proposal";
        toast({ title: "Proposal import failed", description: message, variant: "destructive" });
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
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
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
            <PageSummaryBar columns={3}>
              <PageSummaryStat
                label="Draft"
                value={String(counts.draft)}
                subtitle={`${counts.draft} contract${counts.draft === 1 ? '' : 's'}`}
                status="draft"
              />
              <PageSummaryStat
                label="Pending signatures"
                value={String(counts.pending)}
                subtitle={`${counts.pending} awaiting`}
                status="pending_signatures"
              />
              <PageSummaryStat
                label="Signed"
                value={String(counts.signed)}
                subtitle={`${counts.signed} signed`}
                status="signed"
              />
            </PageSummaryBar>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Find a contract..."
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative h-8 w-8 p-0 ml-auto" aria-label="Filters">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-4" align="end">
              <div className="space-y-3">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_signatures">Pending signatures</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 ? (
                  <Button variant="ghost" size="sm" className="h-8 w-full" onClick={() => setStatusFilter("all")}>
                    Reset filters
                  </Button>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
            </div>

            <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col p-0">
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
              <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Contract</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsPagination.paginatedItems.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${row.id}`)}>
                      <TableCell className="font-semibold">{row.identifier}</TableCell>
                      <TableCell>
                        <TableClientCell client={row.clients} />
                      </TableCell>
                      <TableCell>
                        {row.projects?.name ? row.projects.name : <EmptyValue variant="table" field="project" />}
                      </TableCell>
                      <TableCell>
                        <TableStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatMoney(row.total || 0, row.clients?.currency)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" asChild onClick={(event) => event.stopPropagation()} aria-label="Edit contract">
                            <Link to={`/contracts/${row.id}`}>
                              <SlotIcon slot="action_edit" className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); setCancelId(row.id); }}>
                            <SlotIcon slot="action_delete" className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
            )}
          </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="templates">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col p-0">
                {loading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Loading templates...</div>
                ) : templateRows.length === 0 ? (
                  <div className="py-14 text-center">
                    <h3 className="text-lg font-semibold">No templates yet</h3>
                    <p className="text-sm text-muted-foreground">Create your first reusable contract template.</p>
                  </div>
                ) : (
                  <DataTableFrame>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templatesPagination.paginatedItems.map((row) => (
                        <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/contracts/templates/${row.id}`)}>
                          <TableCell className="font-semibold">{row.name}</TableCell>
                          <TableCell className="max-w-[360px] truncate">
                            {row.description ? row.description : <EmptyValue variant="table" field="description" />}
                          </TableCell>
                          <TableCell>
                            {row.is_default ? <Badge variant="secondary">Default</Badge> : <EmptyValue variant="table" />}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); navigate(`/contracts/templates/${row.id}`); }} aria-label="Edit template">
                                <SlotIcon slot="action_edit" className="h-4 w-4" />
                              </Button>
                              {!row.is_default ? <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); void setTemplateDefault(row.id); }}>Set default</Button> : null}
                              <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); void duplicateTemplate(row.id); }} aria-label="Duplicate template">
                                <SlotIcon slot="action_duplicate" className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setTemplateDeleteId(row.id); }} aria-label="Delete template"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    total={templatesPagination.total}
                    page={templatesPagination.page}
                    pageSize={templatesPagination.pageSize}
                    from={templatesPagination.from}
                    to={templatesPagination.to}
                    pageSizeOptions={templatesPagination.pageSizeOptions}
                    showPageSizeSelect={templatesPagination.showPageSizeSelect}
                    onPageChange={templatesPagination.setPage}
                    onPageSizeChange={templatesPagination.setPageSize}
                  />
                  </DataTableFrame>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateClientDialogOpen(false);
            setCreateProjectDialogOpen(false);
          }
          setCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Client</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setCreateClientDialogOpen(true)}
                >
                  Create new client
                </Button>
              </div>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company ? `${client.name} — ${client.company}` : `${client.name} — Individual`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Project (optional)</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setCreateProjectDialogOpen(true)}
                >
                  Create new project
                </Button>
              </div>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contract Template</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => {
                    setCreateOpen(false);
                    void openCreateTemplate();
                  }}
                >
                  Add new template
                </Button>
              </div>
              <Select value={templateId} onValueChange={(value) => void handleCreateTemplateChange(value)}>
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

      <ClientFormDialog
        open={createClientDialogOpen}
        onOpenChange={setCreateClientDialogOpen}
        onSaved={(client) => {
          setClients((prev) =>
            [...prev.filter((item) => item.id !== client.id), client as any].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setClientId(client.id);
          setProjectId("none");
        }}
      />
      <ProjectFormDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        clients={clients}
        initialClientId={clientId || null}
        onSaved={(project) => {
          setProjects((prev) =>
            [
              ...prev.filter((item) => item.id !== project.id),
              { id: project.id, name: project.name, client_id: project.client_id },
            ].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setProjectId(project.id);
          if (project.client_id) setClientId(project.client_id);
        }}
        onClientSaved={(client) => {
          setClients((prev) =>
            [...prev.filter((item) => item.id !== client.id), client as any].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setClientId(client.id);
        }}
      />

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
      <LanceServiceAgreementDisclaimerDialog
        open={disclaimerOpen}
        onOpenChange={onDisclaimerOpenChange}
        onConfirm={onDisclaimerConfirm}
      />
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
