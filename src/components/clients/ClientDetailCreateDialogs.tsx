import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { notifyStartGuideRefresh } from "@/components/layout/startGuideUtils";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ReviewRequestCreateDialog } from "@/components/reviews/ReviewRequestCreateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { proposalSnapshotsFromClientId } from "@/lib/clientLifecycle";
import { contractClientSnapshotFromClient } from "@/lib/clientForm";
import { applyProposalImportToContract } from "@/lib/contractProposalImport";
import { DEFAULT_CONTRACT_TEMPLATE_CONTENT } from "@/lib/contractTemplate";
import { useLanceServiceAgreementDisclaimer } from "@/hooks/useLanceServiceAgreementDisclaimer";
import { LanceServiceAgreementDisclaimerDialog } from "@/components/contracts/LanceServiceAgreementDisclaimerDialog";

export type ClientDetailCreateType = "project" | "invoice" | "proposal" | "contract" | "approval" | null;

type ClientForCreate = {
  id: string;
  name: string;
  company?: string | null;
  company_name?: string | null;
  entity_type?: string | null;
  company_registration?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  address?: string | null;
};

type ProjectOption = { id: string; name: string };

function LockedClientField({ client }: { client: ClientForCreate }) {
  const label = client.company ? `${client.name} — ${client.company}` : client.name;
  return (
    <div className="space-y-2">
      <Label>Client</Label>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{label}</div>
    </div>
  );
}

type Props = {
  client: ClientForCreate;
  projects: ProjectOption[];
  createType: ClientDetailCreateType;
  onCreateTypeChange: (type: ClientDetailCreateType) => void;
  onRefresh: () => Promise<void>;
  onProjectsChange?: (projects: ProjectOption[]) => void;
};

export function ClientDetailCreateDialogs({
  client,
  projects,
  createType,
  onCreateTypeChange,
  onRefresh,
  onProjectsChange,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const close = () => onCreateTypeChange(null);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.id),
    [projects],
  );

  return (
    <>
      <ProjectFormDialog
        open={createType === "project"}
        onOpenChange={(open) => !open && close()}
        clients={[{ id: client.id, name: client.name, company: client.company }]}
        initialClientId={client.id}
        onSaved={async (project) => {
          onProjectsChange?.([
            { id: project.id, name: project.name },
            ...projects.filter((p) => p.id !== project.id),
          ]);
          await onRefresh();
          close();
        }}
      />

      <InvoiceCreateDialog
        open={createType === "invoice"}
        onOpenChange={(open) => !open && close()}
        client={client}
        projects={clientProjects}
        onCreated={async () => {
          await onRefresh();
          close();
        }}
      />

      <ProposalCreateDialog
        open={createType === "proposal"}
        onOpenChange={(open) => !open && close()}
        client={client}
        projects={clientProjects}
        onCreated={async () => {
          await onRefresh();
          close();
        }}
      />

      <ContractCreateDialog
        open={createType === "contract"}
        onOpenChange={(open) => !open && close()}
        client={client}
        projects={clientProjects}
        onCreated={async () => {
          await onRefresh();
          close();
        }}
      />

      <ReviewRequestCreateDialog
        open={createType === "approval"}
        onOpenChange={(open) => !open && close()}
        lockedClientId={client.id}
        lockedClientName={client.name}
        lockedClientEmail={client.email}
        projects={clientProjects.map((p) => ({ ...p, client_id: client.id }))}
        onSuccess={async () => {
          await onRefresh();
          close();
        }}
      />
    </>
  );
}

function InvoiceCreateDialog({
  open,
  onOpenChange,
  client,
  projects,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientForCreate;
  projects: ProjectOption[];
  onCreated: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState("none");
  const [selectedTaxId, setSelectedTaxId] = useState("");
  const [taxes, setTaxes] = useState<{ id: string; name: string; rate: number }[]>([]);
  const [setupMissing, setSetupMissing] = useState<string[] | null>(null);
  const [defaults, setDefaults] = useState<{
    invoice_notes_default: string | null;
    invoice_footer: string | null;
    invoice_bank_details_default: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setProjectId("none");
    void supabase.from("taxes").select("id, name, rate").order("name").then(({ data }) => setTaxes(data || []));
    void supabase
      .from("profiles")
      .select("business_name, business_email, business_street, business_city, business_country, business_address, invoice_notes_default, invoice_footer, invoice_bank_details_default")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const missing: string[] = [];
        if (!(data?.business_name ?? "").trim()) missing.push("Business name");
        if (!(data?.business_email ?? "").trim()) missing.push("Business email");
        const hasAddress =
          !!((data?.business_address ?? "").trim()) ||
          (!!((data?.business_street ?? "").trim()) &&
            !!((data?.business_city ?? "").trim()) &&
            !!((data?.business_country ?? "").trim()));
        if (!hasAddress) missing.push("Business address");
        if (!(data?.invoice_bank_details_default ?? "").trim()) missing.push("Default bank/payment details");
        setSetupMissing(missing.length ? missing : null);
        setDefaults({
          invoice_notes_default: data?.invoice_notes_default ?? null,
          invoice_footer: data?.invoice_footer ?? null,
          invoice_bank_details_default: data?.invoice_bank_details_default ?? null,
        });
      });
  }, [open, user]);

  const getNextInvoiceNumber = async (): Promise<string> => {
    const { data, error } = await supabase.rpc("next_invoice_number", { p_user_id: user!.id });
    if (!error && typeof data === "string" && data.trim()) return data;
    return `INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const issueDate = (formData.get("issue_date") as string)?.trim();
    const dueDate = (formData.get("due_date") as string)?.trim();
    if (!issueDate || !dueDate) {
      toast({ title: "Issue date and due date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const selectedTax = taxes.find((t) => t.id === selectedTaxId);
      const invoiceNumber = await getNextInvoiceNumber();
      const { error } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        client_id: client.id,
        project_id: projectId === "none" ? null : projectId,
        issue_date: issueDate,
        due_date: dueDate,
        status: "draft",
        notes: defaults?.invoice_notes_default?.trim() || null,
        invoice_footer: defaults?.invoice_footer?.trim() || null,
        bank_details: defaults?.invoice_bank_details_default?.trim() || null,
        subtotal: 0,
        tax_rate: selectedTax?.rate || 0,
        tax_amount: 0,
        total: 0,
        user_id: user.id,
      });
      if (error) throw error;
      toast({ title: "Invoice created" });
      notifyStartGuideRefresh();
      await onCreated();
    } catch (error: unknown) {
      toast({
        title: "Error creating invoice",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Create a draft invoice for this client.</DialogDescription>
        </DialogHeader>
        {setupMissing && (
          <Alert variant="destructive">
            <AlertDescription>
              Complete in{" "}
              <Link to="/settings/invoices" className="font-medium underline" onClick={() => onOpenChange(false)}>
                Invoice Settings
              </Link>
              : {setupMissing.join(", ")}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <LockedClientField client={client} />
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tax Rate</Label>
            <Select value={selectedTaxId || "none"} onValueChange={(v) => setSelectedTaxId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select tax rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No tax</SelectItem>
                {taxes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.rate}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-invoice-issue">Issue Date</Label>
              <Input id="client-invoice-issue" name="issue_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-invoice-due">Due Date</Label>
              <Input id="client-invoice-due" name="due_date" type="date" defaultValue={format(addDays(new Date(), 30), "yyyy-MM-dd")} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !!setupMissing}>
              {saving ? "Creating…" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProposalCreateDialog({
  open,
  onOpenChange,
  client,
  projects,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientForCreate;
  projects: ProjectOption[];
  onCreated: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setProjectId("none");
  }, [open]);

  const createProposal = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let snapshots = { client_name_snapshot: null as string | null, client_company_snapshot: null as string | null };
      try {
        snapshots = await proposalSnapshotsFromClientId(client.id);
      } catch {
        /* optional */
      }
      const { data: profileDefaults } = await supabase
        .from("profiles")
        .select(
          "proposal_default_cover_image_url, proposal_default_validity_days, proposal_default_immediate_availability, proposal_default_payment_structure, proposal_default_payment_methods, proposal_default_conditions_notes, proposal_default_installment_description",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      const { error } = await supabase.from("proposals").insert({
        user_id: user.id,
        client_id: client.id,
        ...snapshots,
        project_id: projectId === "none" ? null : projectId,
        cover_image_url: profileDefaults?.proposal_default_cover_image_url || null,
        validity_days: profileDefaults?.proposal_default_validity_days ?? 30,
        availability_required: profileDefaults?.proposal_default_immediate_availability ?? true,
        payment_structure: profileDefaults?.proposal_default_payment_structure || "upfront",
        payment_methods: profileDefaults?.proposal_default_payment_methods || [],
        conditions_notes: profileDefaults?.proposal_default_conditions_notes || null,
        installment_description: profileDefaults?.proposal_default_installment_description || null,
      } as never);
      if (error) throw error;
      toast({ title: "Proposal created" });
      notifyStartGuideRefresh();
      await onCreated();
    } catch (error: unknown) {
      toast({
        title: "Could not create proposal",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Proposal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <LockedClientField client={client} />
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void createProposal()} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContractCreateDialog({
  open,
  onOpenChange,
  client,
  projects,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientForCreate;
  projects: ProjectOption[];
  onCreated: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState("none");
  const [templateId, setTemplateId] = useState("none");
  const [templates, setTemplates] = useState<{ id: string; name: string; is_default?: boolean; is_lance_template?: boolean }[]>([]);
  const [proposalCandidates, setProposalCandidates] = useState<{ id: string; identifier: string }[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState("none");
  const [saving, setSaving] = useState(false);
  const { disclaimerOpen, pendingTemplate, requestAcceptance, handleDisclaimerAccept, handleDisclaimerOpenChange } =
    useLanceServiceAgreementDisclaimer();

  useEffect(() => {
    if (!open || !user) return;
    setProjectId("none");
    setSelectedProposalId("none");
    void (async () => {
      const { data: allTemplates } = await supabase
        .from("contract_templates")
        .select("id, name, is_default, is_lance_template")
        .order("created_at");
      let rows = allTemplates || [];
      if (rows.length === 0) {
        const { data: inserted } = await supabase
          .from("contract_templates")
          .insert({
            user_id: user.id,
            name: "Service Agreement",
            description: "Standard English template for freelance services agreements.",
            content: DEFAULT_CONTRACT_TEMPLATE_CONTENT,
            is_default: true,
            is_lance_template: true,
          } as never)
          .select("id, name, is_default, is_lance_template")
          .single();
        if (inserted) rows = [inserted];
      }
      setTemplates(rows);
      const defaultTemplate = rows.find((t) => t.is_default) || rows[0];
      setTemplateId(defaultTemplate?.id || "none");
    })();
  }, [open, user]);

  useEffect(() => {
    if (!open || projectId === "none") {
      setProposalCandidates([]);
      setSelectedProposalId("none");
      return;
    }
    void supabase
      .from("proposals")
      .select("id, identifier")
      .eq("project_id", projectId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProposalCandidates(data || []);
        setSelectedProposalId("none");
      });
  }, [open, projectId]);

  const handleTemplateChange = async (nextTemplateId: string) => {
    const selected = templates.find((t) => t.id === nextTemplateId);
    const accepted = await requestAcceptance(selected);
    if (!accepted) return;
    setTemplateId(nextTemplateId);
  };

  const createContract = async () => {
    if (!user || templateId === "none") return;
    const selectedTemplate = templates.find((t) => t.id === templateId);
    const accepted = await requestAcceptance(selectedTemplate);
    if (!accepted) return;
    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, business_name, business_phone, business_address, business_city, business_state, business_postal_code, business_country, business_street, business_street2, tax_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const clientSnapshot = contractClientSnapshotFromClient(client);
      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          user_id: user.id,
          client_id: client.id,
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
          template_id: templateId,
        } as never)
        .select("id")
        .single();
      if (error || !contract) throw error || new Error("Could not create contract");
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
        .eq("id", client.id)
        .not("status", "in", "(Won,Active)");
      toast({ title: "Contract created" });
      notifyStartGuideRefresh();
      await onCreated();
    } catch (error: unknown) {
      toast({
        title: "Could not create contract",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <LockedClientField client={client} />
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {proposalCandidates.length > 0 ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-medium">Import data from an accepted proposal?</p>
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
              <Label>Contract Template</Label>
              <Select value={templateId} onValueChange={(value) => void handleTemplateChange(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createContract()} disabled={saving || templateId === "none"}>
              {saving ? "Creating…" : "Create Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LanceServiceAgreementDisclaimerDialog
        open={disclaimerOpen}
        onOpenChange={handleDisclaimerOpenChange}
        onAccept={handleDisclaimerAccept}
        templateName={pendingTemplate?.name}
      />
    </>
  );
}
