import { describe, expect, it } from "vitest";
import { effectiveValidityDays, mergeProposalWithDefaults, normalizeProposalPaymentMethods } from "./proposalDefaults";

describe("proposalDefaults", () => {
  it("normalizes other payment methods", () => {
    expect(normalizeProposalPaymentMethods(["bank transfer", "other: Wire"])).toEqual({
      payment_methods: ["bank transfer", "other"],
      payment_other: "Wire",
    });
  });

  it("merges profile defaults into empty proposal fields", () => {
    const merged = mergeProposalWithDefaults(
      { payment_methods: [], validity_days: null },
      {
        proposal_default_validity_days: 14,
        proposal_default_immediate_availability: false,
        proposal_default_payment_structure: "installments",
        proposal_default_payment_methods: ["paypal"],
        proposal_default_conditions_notes: "Net 30",
        proposal_default_installment_description: "50/50",
        proposal_default_cover_image_url: null,
      },
    );
    expect(merged.validity_days).toBe(14);
    expect(merged.payment_structure).toBe("installments");
    expect(merged.payment_methods).toEqual(["paypal"]);
    expect(merged.installment_description).toBe("50/50");
  });

  it("uses 30 days when validity is missing", () => {
    expect(effectiveValidityDays({ validity_days: null })).toBe(30);
    expect(effectiveValidityDays({ validity_days: 7 })).toBe(7);
  });
});
