import { supabase } from "@/integrations/supabase/client";
import { normalizeProposalPaymentMethods } from "@/lib/proposalDefaults";

export type ProposalForContractImport = {
  id: string;
  identifier: string;
  status: string;
  timeline_days: number | null;
  availability_required: boolean;
  payment_structure: string | null;
  installment_description: string | null;
  payment_methods: string[];
  conditions_notes: string | null;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  total: number;
};

export type ProposalServiceForContractImport = {
  service_id: string | null;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  position?: number;
};

export function buildContractPatchFromProposal(proposal: ProposalForContractImport) {
  const payment = normalizeProposalPaymentMethods(proposal.payment_methods);
  const paymentMethodsForSave =
    payment.payment_methods.includes("other") && payment.payment_other
      ? [...payment.payment_methods.filter((method) => method !== "other"), `other: ${payment.payment_other}`]
      : payment.payment_methods.filter((method) => method !== "other");
  return {
    proposal_id: proposal.id,
    timeline_days: proposal.timeline_days,
    immediate_availability: proposal.availability_required,
    payment_structure: proposal.payment_structure || "upfront",
    installment_description: proposal.installment_description,
    payment_methods: paymentMethodsForSave,
    additional_clause: proposal.conditions_notes,
    subtotal: proposal.subtotal,
    discount: proposal.discount_value,
    discount_type: proposal.discount_type === "amount" ? "fixed" : proposal.discount_type,
    total: proposal.total,
  };
}

export function mapProposalServicesToContractRows(
  contractId: string,
  proposalItems: ProposalServiceForContractImport[],
) {
  return proposalItems.map((item, index) => ({
    contract_id: contractId,
    service_id: item.service_id,
    name: item.name,
    description: item.description,
    price: item.price,
    quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
    sort_order: item.position ?? index,
  }));
}

export type AcceptedProposalOption = {
  id: string;
  identifier: string;
  project_id: string | null;
};

/** Accepted proposals for a contract's client (project match sorted first when provided). */
export async function fetchAcceptedProposalsForContract(options: {
  clientId?: string | null;
  projectId?: string | null;
}): Promise<{ clientId: string | null; proposals: AcceptedProposalOption[] }> {
  let clientId = options.clientId?.trim() || null;
  if (!clientId && options.projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("client_id")
      .eq("id", options.projectId)
      .maybeSingle();
    clientId = (project?.client_id as string | null) || null;
  }
  if (!clientId) {
    return { clientId: null, proposals: [] };
  }

  const { data, error } = await supabase
    .from("proposals")
    .select("id, identifier, project_id")
    .eq("client_id", clientId)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false });

  if (error) throw error;

  const proposals = ((data || []) as AcceptedProposalOption[]).slice().sort((a, b) => {
    if (!options.projectId) return 0;
    const aMatch = a.project_id === options.projectId;
    const bMatch = b.project_id === options.projectId;
    if (aMatch && !bMatch) return -1;
    if (bMatch && !aMatch) return 1;
    return 0;
  });

  return { clientId, proposals };
}

export async function fetchProposalForContractImport(proposalId: string) {
  const [{ data: proposal, error: proposalError }, { data: proposalItems, error: itemsError }] =
    await Promise.all([
      supabase.from("proposals").select("*").eq("id", proposalId).single(),
      supabase
        .from("proposal_services")
        .select("service_id, name, description, price, quantity, position")
        .eq("proposal_id", proposalId)
        .order("position"),
    ]);

  if (proposalError || !proposal) {
    throw proposalError || new Error("Proposal not found");
  }
  if (proposal.status !== "accepted") {
    throw new Error("Only accepted proposals can be imported into a contract");
  }
  if (itemsError) throw itemsError;

  return {
    proposal: proposal as ProposalForContractImport,
    proposalItems: (proposalItems || []) as ProposalServiceForContractImport[],
  };
}

export async function applyProposalImportToContract(contractId: string, proposalId: string) {
  const { proposal, proposalItems } = await fetchProposalForContractImport(proposalId);
  const patch = buildContractPatchFromProposal(proposal);

  const { error: contractError } = await supabase
    .from("contracts")
    .update(patch as never)
    .eq("id", contractId);
  if (contractError) throw contractError;

  const { error: deleteError } = await supabase
    .from("contract_services")
    .delete()
    .eq("contract_id", contractId);
  if (deleteError) throw deleteError;

  if (proposalItems.length) {
    const rows = mapProposalServicesToContractRows(contractId, proposalItems);
    const { error: insertError } = await supabase.from("contract_services").insert(rows as never);
    if (insertError) throw insertError;
  }

  return { proposal, itemCount: proposalItems.length };
}
