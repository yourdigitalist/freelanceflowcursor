import type { ProposalLayoutDocument } from "@/lib/proposals2/layoutSchema";

export function createDefaultProposalLayoutDocument(): ProposalLayoutDocument {
  return {
    version: 1,
    theme: { mainColor: "#9b63e9" },
    containers: [
      {
        id: "intro",
        title: "Introduction",
        columns: 1,
        style: { backgroundColor: "#ffffff", padding: 16, radius: 12 },
        blocks: [
          {
            column: 0,
            block: {
              id: "heading-intro",
              type: "heading",
              level: 1,
              text: "Proposal",
              style: { fontSize: 32, color: "#1a1a2e", fontWeight: "semibold", fontFamily: "inherit", textAlign: "left" },
            },
          },
          { column: 0, block: { id: "meta-intro", type: "proposal-meta", showIdentifier: true, showProjectName: true } },
          { column: 0, block: { id: "client-business", type: "client-business" } },
        ],
      },
      {
        id: "scope",
        title: "Scope & pricing",
        columns: 2,
        style: { backgroundColor: "#ffffff", padding: 16, radius: 12 },
        blocks: [
          { column: 0, block: { id: "services", type: "services-table", showDescription: true, showQuantity: true } },
          { column: 1, block: { id: "totals", type: "totals" } },
          {
            column: 1,
            block: {
              id: "conditions",
              type: "conditions",
              showTimeline: true,
              showPaymentStructure: true,
              showPaymentMethods: true,
              showInstallmentDescription: true,
              showNotes: true,
            },
          },
        ],
      },
      {
        id: "close",
        title: "Acceptance",
        columns: 1,
        style: { backgroundColor: "#ffffff", padding: 16, radius: 12 },
        blocks: [{ column: 0, block: { id: "acceptance", type: "acceptance" } }],
      },
    ],
  };
}
