import { supabase } from "@/integrations/supabase/client";

export type ProposalProfileDefaults = {
  proposal_default_cover_image_url: string | null;
  proposal_default_validity_days: number | null;
  proposal_default_immediate_availability: boolean | null;
  proposal_default_payment_structure: "upfront" | "installments" | null;
  proposal_default_payment_methods: string[] | null;
  proposal_default_conditions_notes: string | null;
  proposal_default_installment_description: string | null;
};

export function normalizeProposalPaymentMethods(methods: string[] | null | undefined) {
  const list = Array.isArray(methods) ? methods : [];
  const otherMethod = list.find((method) => method.startsWith("other:"));
  return {
    payment_methods: otherMethod
      ? [...list.filter((method) => !method.startsWith("other:")), "other"]
      : list,
    payment_other: otherMethod ? otherMethod.replace(/^other:\s*/i, "") : "",
  };
}

export function mergeProposalWithDefaults<T extends Record<string, unknown>>(
  proposal: T,
  defaults: ProposalProfileDefaults | null | undefined,
): T {
  if (!defaults) return proposal;
  const payment = normalizeProposalPaymentMethods(
    (proposal.payment_methods as string[] | undefined)?.length
      ? (proposal.payment_methods as string[])
      : defaults.proposal_default_payment_methods || [],
  );
  return {
    ...proposal,
    validity_days:
      proposal.validity_days != null && Number(proposal.validity_days) > 0
        ? proposal.validity_days
        : (defaults.proposal_default_validity_days ?? 30),
    cover_image_url: proposal.cover_image_url ?? defaults.proposal_default_cover_image_url ?? null,
    availability_required:
      proposal.availability_required != null
        ? proposal.availability_required
        : (defaults.proposal_default_immediate_availability ?? true),
    payment_structure:
      proposal.payment_structure || defaults.proposal_default_payment_structure || "upfront",
    conditions_notes: proposal.conditions_notes ?? defaults.proposal_default_conditions_notes ?? null,
    installment_description:
      proposal.installment_description ?? defaults.proposal_default_installment_description ?? null,
    ...payment,
  };
}

export function effectiveValidityDays(proposal: { validity_days?: number | null } | null | undefined) {
  const days = Number(proposal?.validity_days);
  return Number.isFinite(days) && days > 0 ? days : 30;
}

export async function assignProposalIdentifierIfMissing(
  proposalId: string,
  userId: string,
  current: string | null | undefined,
): Promise<string> {
  const trimmed = String(current || "").trim();
  if (trimmed) return trimmed;

  const year = new Date().getFullYear();
  const { data: rows, error } = await supabase
    .from("proposals")
    .select("identifier")
    .eq("user_id", userId)
    .like("identifier", `P-${year}-%`);

  if (error) throw error;

  const maxSeq =
    (rows || []).reduce((max, row) => {
      const match = /^P-\d{4}-(\d+)$/.exec(String(row.identifier || ""));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) ?? 0;

  const identifier = `P-${year}-${String(maxSeq + 1).padStart(5, "0")}`;
  const { data: updated, error: updateError } = await supabase
    .from("proposals")
    .update({ identifier })
    .eq("id", proposalId)
    .select("identifier")
    .single();

  if (updateError) throw updateError;
  return String(updated?.identifier || identifier);
}
