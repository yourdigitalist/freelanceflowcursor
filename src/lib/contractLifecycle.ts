import { supabase } from "@/integrations/supabase/client";

export function isContractArchived(contract: { archived_at?: string | null } | null | undefined): boolean {
  return Boolean(contract?.archived_at);
}

export function buildArchiveContractConfirmMessage(identifier: string): string {
  return `Archive ${identifier}? It will be hidden from your main contracts list. The contract record and signatures are kept.`;
}

export function buildRestoreContractConfirmMessage(identifier: string): string {
  return `Restore ${identifier} to your active contracts list?`;
}

/** Unlinks project so the project can be deleted; keeps contract history intact. */
export async function archiveContract(contractId: string) {
  const { error } = await supabase
    .from("contracts")
    .update({
      archived_at: new Date().toISOString(),
      project_id: null,
    })
    .eq("id", contractId);
  return { error };
}

export async function restoreContract(contractId: string) {
  const { error } = await supabase.from("contracts").update({ archived_at: null }).eq("id", contractId);
  return { error };
}
