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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Search, Filter } from "@/components/icons";
import { SlotIcon } from "@/contexts/IconSlotContext";
import { useLocalePreferences } from "@/hooks/useLocalePreferences";
import { formatLocaleDate } from "@/lib/datetime";
import { proposalSnapshotsFromClientId } from "@/lib/clientLifecycle";
import { displayProposalClientName } from "@/lib/proposalClientDisplay";
import { formatStatusLabel, getStatusBadgeClass } from "@/lib/statusDisplay";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";

type ProposalRow = {
  id: string;
  identifier: string;
  status: string;
  total: number;
  expires_at: string | null;
  client_id: string;
  project_id: string | null;
  client_name_snapshot?: string | null;
  client_company_snapshot?: string | null;
  clients: { name: string; currency?: string | null } | null;
  projects: { name: string } | null;
};

type ProposalDefaults = {
  proposal_default_cover_image_url: string | null;
  proposal_default_validity_days: number | null;
  proposal_default_immediate_availability: boolean | null;
  proposal_default_payment_structure: "upfront" | "installments" | null;
  proposal_default_payment_methods: string[] | null;
  proposal_default_conditions_notes: string | null;
  proposal_default_installment_description: string | null;
};

export default function Proposals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; currency?: string | null; email?: string | null; company?: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "read" | "accepted">("all");
  const [defaults, setDefaults] = useState<ProposalDefaults | null>(null);
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const { dateFormat } = useLocalePreferences();


  const load = async () => {
    const [{ data: proposals }, { data: allClients }, { data: allProjects }, { data: profileDefaults }] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, identifier, status, total, expires_at, client_id, project_id, client_name_snapshot, client_company_snapshot, clients(name, currency), projects(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, currency, email, company").is("archived_at", null).order("name"),
      supabase.from("projects").select("id, name, client_id").order("name"),
      user
        ? supabase
            .from("profiles")
            .select(
              "proposal_default_cover_image_url, proposal_default_validity_days, proposal_default_immediate_availability, proposal_default_payment_structure, proposal_default_payment_methods, proposal_default_conditions_notes, proposal_default_installment_description"
            )
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    setRows(((proposals || []) as any).map((p: any) => ({ ...p, total: Number(p.total || 0) })));
    setClients((allClients || []) as any);
    setProjects((allProjects || []) as any);
    setDefaults((profileDefaults || null) as ProposalDefaults | null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  useEffect(() => {
    const client = searchParams.get("client");
    if (!client || clients.length === 0) return;
    if (!clients.some((c) => c.id === client)) return;
    setClientId(client);
    setProjectId("none");
    setCreateOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, clients, setSearchParams]);

  const filteredProjects = useMemo(
    () => projects.filter((p) => !clientId || p.client_id === clientId),
    [projects, clientId]
  );

  const counts = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    return { draft: by("draft"), sent: by("sent"), read: by("read"), accepted: by("accepted") };
  }, [rows]);

  const formatMoney = (amount: number, currencyCode?: string | null) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode || "USD" }).format(amount || 0);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;
      const matchesQuery = !query || [row.identifier, displayProposalClientName(row), row.projects?.name || ""].join(" ").toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [rows, searchQuery, statusFilter]);
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const createProposal = async () => {
    if (!user || !clientId) return;
    let snapshots = { client_name_snapshot: null as string | null, client_company_snapshot: null as string | null };
    try {
      snapshots = await proposalSnapshotsFromClientId(clientId);
    } catch {
      /* proceed without snapshots */
    }
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        user_id: user.id,
        client_id: clientId,
        ...snapshots,
        project_id: projectId === "none" ? null : projectId,
        cover_image_url: defaults?.proposal_default_cover_image_url || null,
        validity_days: defaults?.proposal_default_validity_days ?? 30,
        availability_required: defaults?.proposal_default_immediate_availability ?? true,
        payment_structure: defaults?.proposal_default_payment_structure || "upfront",
        payment_methods: defaults?.proposal_default_payment_methods || [],
        conditions_notes: defaults?.proposal_default_conditions_notes || null,
        installment_description: defaults?.proposal_default_installment_description || null,
      } as any)
      .select("id, identifier")
      .single();
    if (error) {
      toast({ title: "Could not create proposal", description: error.message, variant: "destructive" });
      return;
    }
    const selectedClient = clients.find((c) => c.id === clientId);
    setCreateOpen(false);
    setClientId("");
    setProjectId("none");
    navigate(`/proposals/${data.id}`, {
      state: {
        fromCreate: true,
        clientId,
        projectId: projectId === "none" ? null : projectId,
        client_name_snapshot: snapshots.client_name_snapshot,
        client_company_snapshot: snapshots.client_company_snapshot,
        clients: selectedClient
          ? { name: selectedClient.name, company: selectedClient.company ?? null, currency: selectedClient.currency ?? null }
          : null,
      },
    });
  };

  const duplicateProposal = async (id: string) => {
    if (!user) return;
    const { data: proposal } = await supabase.from("proposals").select("*").eq("id", id).single();
    if (!proposal) return;
    const { data: items } = await supabase.from("proposal_services").select("*").eq("proposal_id", id).order("position");
    const { data: copy, error } = await supabase
      .from("proposals")
      .insert({
        user_id: user.id,
        client_id: proposal.client_id,
        client_name_snapshot: proposal.client_name_snapshot,
        client_company_snapshot: proposal.client_company_snapshot,
        project_id: proposal.project_id,
        objective: proposal.objective,
        presentation: proposal.presentation,
        validity_days: proposal.validity_days,
        expires_at: proposal.expires_at,
        cover_image_url: proposal.cover_image_url,
        subtotal: proposal.subtotal,
        discount_type: proposal.discount_type,
        discount_value: proposal.discount_value,
        total: proposal.total,
        availability_required: proposal.availability_required,
        timeline_days: proposal.timeline_days,
        payment_structure: proposal.payment_structure,
        payment_methods: proposal.payment_methods,
        installment_description: proposal.installment_description,
        conditions_notes: proposal.conditions_notes,
      } as any)
      .select("id")
      .single();
    if (error || !copy) {
      toast({ title: "Could not duplicate", variant: "destructive" });
      return;
    }
    if (items?.length) {
      const { error: itemsCopyError } = await supabase.from("proposal_services").insert(
        items.map(({ id: _id, created_at: _c, proposal_id: _p, ...rest }: any) => ({ ...rest, proposal_id: copy.id }))
      );
      if (itemsCopyError) {
        toast({ title: "Proposal duplicated without services", description: itemsCopyError.message, variant: "destructive" });
      }
    }
    toast({ title: "Proposal duplicated" });
    await load();
  };

  const deleteProposal = async () => {
    if (!deleteId) return;
    await supabase.from("proposals").delete().eq("id", deleteId);
    setDeleteId(null);
    await load();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Proposal</Button>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Your proposals in negotiation</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Draft", counts.draft],
            ["Sent", counts.sent],
            ["Read", counts.read],
          ].map(([label, value]) => (
            <Card key={label as string} className="border-0 shadow-sm">
              <CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value as number}</p></CardContent>
            </Card>
          ))}
        </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a proposal..."
              className="pl-10 bg-card"
            />
          </div>
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
            <PopoverContent className="w-[240px] p-4" align="end">
              <div className="space-y-3">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
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
          <CardContent className="p-0">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading proposals...</div>
            ) : filteredRows.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold">No proposals yet</h3>
                <p className="text-sm text-muted-foreground">Create your first proposal to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead><TableHead>Client</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/proposals/${row.id}`)}>
                      <TableCell className="font-medium">{row.identifier}</TableCell>
                      <TableCell>{displayProposalClientName(row)}</TableCell>
                      <TableCell>{row.projects?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClass(row.status)}>
                          {formatStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatMoney(row.total || 0, row.clients?.currency)}</TableCell>
                      <TableCell>{formatLocaleDate(row.expires_at, dateFormat)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" asChild onClick={(event) => event.stopPropagation()} aria-label="Edit proposal">
                            <Link to={`/proposals/${row.id}`}>
                              <SlotIcon slot="action_edit" className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); void duplicateProposal(row.id); }}>
                            <SlotIcon slot="action_duplicate" className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); setDeleteId(row.id); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
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
          <DialogHeader><DialogTitle>Create Proposal</DialogTitle></DialogHeader>
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
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {filteredProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!clientId ? (
                <p className="text-xs text-muted-foreground">Tip: choose a client first to filter related projects.</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>Identifier</Label>
              <Input value="Generated on save" readOnly />
              <p className="text-xs text-muted-foreground">
                Automatic proposal ID is enabled. You can customize it after creation, and you can disable auto-ID anytime in Settings.
              </p>
            </div>
          </div>
          <DialogFooter><Button onClick={createProposal} disabled={!clientId}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientFormDialog
        open={createClientDialogOpen}
        onOpenChange={setCreateClientDialogOpen}
        onSaved={(client) => {
          setClients((prev) =>
            [...prev.filter((item) => item.id !== client.id), client].sort((a, b) =>
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
            [...prev.filter((item) => item.id !== client.id), client].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setClientId(client.id);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete proposal?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteProposal}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
