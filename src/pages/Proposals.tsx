import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Plus, Trash2 } from "@/components/icons";
import { SlotIcon } from "@/contexts/IconSlotContext";

type ProposalRow = {
  id: string;
  identifier: string;
  status: string;
  total: number;
  expires_at: string | null;
  client_id: string;
  project_id: string | null;
  clients: { name: string } | null;
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
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "read" | "accepted">("all");
  const [defaults, setDefaults] = useState<ProposalDefaults | null>(null);

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

  const load = async () => {
    const [{ data: proposals }, { data: allClients }, { data: allProjects }, { data: profileDefaults }] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, identifier, status, total, expires_at, client_id, project_id, clients(name), projects(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").order("name"),
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

  const filteredProjects = useMemo(
    () => projects.filter((p) => !clientId || p.client_id === clientId),
    [projects, clientId]
  );

  const counts = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    return { draft: by("draft"), sent: by("sent"), read: by("read"), accepted: by("accepted") };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;
      const matchesQuery = !query || [row.identifier, row.clients?.name || "", row.projects?.name || ""].join(" ").toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [rows, searchQuery, statusFilter]);

  const createProposal = async () => {
    if (!user || !clientId) return;
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        user_id: user.id,
        client_id: clientId,
        project_id: projectId === "none" ? null : projectId,
        cover_image_url: defaults?.proposal_default_cover_image_url || null,
        validity_days: defaults?.proposal_default_validity_days ?? 30,
        availability_required: defaults?.proposal_default_immediate_availability ?? true,
        payment_structure: defaults?.proposal_default_payment_structure || "upfront",
        payment_methods: defaults?.proposal_default_payment_methods || [],
        conditions_notes: defaults?.proposal_default_conditions_notes || null,
        installment_description: defaults?.proposal_default_installment_description || null,
      } as any)
      .select("id")
      .single();
    if (error) {
      toast({ title: "Could not create proposal", description: error.message, variant: "destructive" });
      return;
    }
    setCreateOpen(false);
    setClientId("");
    setProjectId("none");
    navigate(`/proposals/${data.id}`);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Proposals</h1>
            <p className="text-muted-foreground">Create and send polished proposals.</p>
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

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find a proposal..."
            className="max-w-sm"
          />
          {(["all", "draft", "sent", "read", "accepted"] as const).map((status) => (
            <Button key={status} variant={statusFilter === status ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
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
                      <TableCell>{row.clients?.name || "—"}</TableCell>
                      <TableCell>{row.projects?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(row.status)}>
                          {formatStatus(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(row.total || 0)}</TableCell>
                      <TableCell>{row.expires_at ? new Date(row.expires_at).toLocaleDateString() : "—"}</TableCell>
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
                          <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); setDeleteId(row.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                  onClick={() => {
                    setCreateOpen(false);
                    navigate("/clients");
                  }}
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
                  onClick={() => {
                    setCreateOpen(false);
                    navigate("/projects");
                  }}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete proposal?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteProposal}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
