import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { SEED_SERVICE_PREFIX, SEED_TAG } from "./constants";

type Db = SupabaseClient<Database>;

export async function clearSeedData(supabase: Db, userId: string): Promise<void> {
  const { data: seedClients, error: clientsError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .contains("tags", [SEED_TAG]);

  if (clientsError) throw clientsError;
  const clientIds = (seedClients ?? []).map((c) => c.id);

  if (clientIds.length > 0) {
    const { data: projects } = await supabase.from("projects").select("id").in("client_id", clientIds);
    const projectIds = (projects ?? []).map((p) => p.id);

    if (projectIds.length > 0) {
      await supabase.from("time_entries").delete().in("project_id", projectIds);
      await supabase.from("tasks").delete().in("project_id", projectIds);
    }

    const { data: proposalRows } = await supabase.from("proposals").select("id").in("client_id", clientIds);
    const proposalIds = (proposalRows ?? []).map((p) => p.id);
    if (proposalIds.length > 0) {
      await supabase.from("proposal_services").delete().in("proposal_id", proposalIds);
    }
    await supabase.from("proposals").delete().in("client_id", clientIds);

    const contractIds =
      (await supabase.from("contracts").select("id").in("client_id", clientIds)).data?.map((c) => c.id) ?? [];
    if (contractIds.length > 0) {
      await supabase.from("contract_services").delete().in("contract_id", contractIds);
      await supabase.from("contracts").delete().in("id", contractIds);
    }

    const invoiceIds =
      (await supabase.from("invoices").select("id").in("client_id", clientIds)).data?.map((i) => i.id) ?? [];
    if (invoiceIds.length > 0) {
      await supabase.from("invoice_items").delete().in("invoice_id", invoiceIds);
      await supabase.from("invoices").delete().in("id", invoiceIds);
    }

    await supabase.from("projects").delete().in("client_id", clientIds);
    await supabase.from("notes").delete().in("client_id", clientIds);
    await supabase.from("review_requests").delete().in("client_id", clientIds);
    await supabase.from("client_activities").delete().in("client_id", clientIds);
    await supabase.from("client_follow_ups").delete().in("client_id", clientIds);
    await supabase.from("clients").delete().in("id", clientIds);
  }

  const { data: seedServices } = await supabase
    .from("services")
    .select("id")
    .eq("user_id", userId)
    .like("name", `${SEED_SERVICE_PREFIX}%`);

  const serviceIds = (seedServices ?? []).map((s) => s.id);
  if (serviceIds.length > 0) {
    await supabase.from("services").delete().in("id", serviceIds);
  }
}
