import { supabase } from "@/integrations/supabase/client";

export type ClientRelatedCounts = {
  proposals: number;
  contracts: number;
  invoices: number;
  projects: number;
  approvals: number;
  notes: number;
  timeEntries: number;
  activities: number;
  followUps: number;
};

export function isClientArchived(client: { archived_at?: string | null } | null | undefined): boolean {
  return Boolean(client?.archived_at);
}

async function countTimeEntriesForClient(clientId: string): Promise<number> {
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", clientId);
  if (projectsError) throw projectsError;
  const projectIds = (projects || []).map((p) => p.id);
  if (projectIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("time_entries")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds);
  if (error) throw error;
  return count ?? 0;
}

export async function getClientRelatedCounts(clientId: string): Promise<ClientRelatedCounts> {
  const countFor = async (table: "proposals" | "contracts" | "invoices" | "projects" | "review_requests" | "notes" | "client_activities" | "client_follow_ups") => {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);
    if (error) throw error;
    return count ?? 0;
  };

  const [proposals, contracts, invoices, projects, approvals, notes, timeEntries, activities, followUps] =
    await Promise.all([
      countFor("proposals"),
      countFor("contracts"),
      countFor("invoices"),
      countFor("projects"),
      countFor("review_requests"),
      countFor("notes"),
      countTimeEntriesForClient(clientId),
      countFor("client_activities"),
      countFor("client_follow_ups"),
    ]);

  return {
    proposals,
    contracts,
    invoices,
    projects,
    approvals,
    notes,
    timeEntries,
    activities,
    followUps,
  };
}

export function canHardDeleteClient(counts: ClientRelatedCounts): boolean {
  return Object.values(counts).every((n) => n === 0);
}

export function hasClientRelatedRecords(counts: ClientRelatedCounts): boolean {
  return !canHardDeleteClient(counts);
}

function formatCountLine(label: string, count: number): string | null {
  if (count <= 0) return null;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function buildBlockedDeleteMessage(counts: ClientRelatedCounts): string {
  const parts = [
    formatCountLine("proposal", counts.proposals),
    formatCountLine("contract", counts.contracts),
    formatCountLine("invoice", counts.invoices),
    formatCountLine("project", counts.projects),
    formatCountLine("approval", counts.approvals),
    formatCountLine("note", counts.notes),
    counts.timeEntries > 0 ? `${counts.timeEntries} time entr${counts.timeEntries === 1 ? "y" : "ies"}` : null,
    formatCountLine("activity", counts.activities),
    formatCountLine("follow-up", counts.followUps),
  ].filter(Boolean);
  const summary = parts.length ? parts.join(", ") : "related records";
  return `This client has ${summary}. Archive them instead to hide from your workspace while keeping your records intact.`;
}

export function buildArchiveConfirmMessage(clientName: string): string {
  return `Archive ${clientName}? They'll be hidden from your main client list and can't be selected for new work. All proposals, contracts, invoices, and projects will stay linked.`;
}

export function buildDeleteConfirmMessage(): string {
  return "Delete this client permanently? This cannot be undone.";
}

export function buildRestoreConfirmMessage(clientName: string): string {
  return `Restore ${clientName} to your active client list?`;
}

export async function archiveClient(clientId: string) {
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", clientId);
  return { error };
}

export async function restoreClient(clientId: string) {
  const { error } = await supabase.from("clients").update({ archived_at: null }).eq("id", clientId);
  return { error };
}

export async function deleteClient(clientId: string) {
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  return { error };
}

export function formatClientDeleteError(message: string): string {
  if (message.includes("proposals_client_id_fkey")) {
    return "This client has proposals linked. Archive the client instead, or delete those proposals first.";
  }
  return message;
}

export async function proposalSnapshotsFromClientId(clientId: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("name, company")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return {
    client_name_snapshot: data?.name?.trim() || null,
    client_company_snapshot: data?.company?.trim() || null,
  };
}
