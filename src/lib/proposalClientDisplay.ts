export type ProposalClientDisplaySource = {
  client_name_snapshot?: string | null;
  client_company_snapshot?: string | null;
  clients?: { name?: string | null; company?: string | null; logo_url?: string | null } | null;
};

export function displayProposalClientName(proposal: ProposalClientDisplaySource | null | undefined): string {
  if (!proposal) return "—";
  const snapshot = String(proposal.client_name_snapshot || "").trim();
  if (snapshot) return snapshot;
  return proposal.clients?.name?.trim() || "—";
}

export function displayProposalClientCompany(proposal: ProposalClientDisplaySource | null | undefined): string | null {
  if (!proposal) return null;
  const snapshot = String(proposal.client_company_snapshot || "").trim();
  if (snapshot) return snapshot;
  return proposal.clients?.company?.trim() || null;
}
