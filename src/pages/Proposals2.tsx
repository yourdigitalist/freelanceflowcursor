import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { listPageBreadcrumb } from "@/lib/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatStatusLabel, getStatusBadgeClass } from "@/lib/statusDisplay";

type ClientOption = { id: string; name: string; company: string | null };
type ProjectOption = { id: string; name: string; client_id: string | null };

type Proposal2Row = {
  id: string;
  identifier: string;
  status: string;
  updated_at: string;
  client_name_snapshot: string | null;
  clients?: { name?: string | null; company?: string | null } | null;
};

const createIdentifier = () => `P2-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`;

export default function Proposals2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Proposal2Row[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [titleInput, setTitleInput] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: proposals }, { data: clientsData }, { data: projectsData }] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, identifier, status, updated_at, client_name_snapshot, layout, clients(name, company)")
        .not("layout", "is", null)
        .order("updated_at", { ascending: false }),
      supabase.from("clients").select("id, name, company").order("name"),
      supabase.from("projects").select("id, name, client_id").order("name"),
    ]);
    setRows((proposals || []) as Proposal2Row[]);
    setClients((clientsData || []) as ClientOption[]);
    setProjects((projectsData || []) as ProjectOption[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredProjects = useMemo(
    () => projects.filter((project) => !clientId || project.client_id === clientId),
    [projects, clientId],
  );

  const createProposal2 = async () => {
    if (!user?.id || !clientId) return;
    setCreating(true);
    const selectedClient = clients.find((item) => item.id === clientId);
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        user_id: user.id,
        client_id: clientId,
        project_id: projectId === "none" ? null : projectId,
        identifier: titleInput.trim() || createIdentifier(),
        status: "draft",
        client_name_snapshot: selectedClient?.name || null,
        client_company_snapshot: selectedClient?.company || null,
        layout: null,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data?.id) {
      toast({ title: "Could not create Proposals 2 draft", description: error?.message, variant: "destructive" });
      return;
    }
    setCreateOpen(false);
    setClientId("");
    setProjectId("none");
    setTitleInput("");
    navigate(`/proposals-2/${data.id}/builder`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <PageBreadcrumb items={listPageBreadcrumb("Proposals 2")} />
            <h1 className="mt-1 text-2xl font-bold">Proposals 2</h1>
            <p className="text-sm text-muted-foreground">Admin workspace for the new visual proposal builder.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>New Proposals 2</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">Loading proposals…</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">No Proposals 2 drafts yet. Create your first one.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/proposals-2/${row.id}/builder`)}
                    >
                      <TableCell>{row.identifier || "Draft"}</TableCell>
                      <TableCell>{row.client_name_snapshot || row.clients?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClass(row.status)}>
                          {formatStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(row.updated_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Proposals 2 draft</DialogTitle>
            <DialogDescription>Start a new proposal in the Proposals 2 builder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company ? `${client.name} — ${client.company}` : client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Identifier (optional)</Label>
              <Input value={titleInput} onChange={(event) => setTitleInput(event.target.value)} placeholder="P2-..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createProposal2} disabled={creating || !clientId}>
              {creating ? "Creating..." : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
