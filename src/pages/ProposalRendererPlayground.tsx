import { AppLayout } from "@/components/layout/AppLayout";
import { ProposalRenderer } from "@/components/proposals/ProposalRenderer";
import type { ProposalLayoutDocument } from "@/lib/proposals2/layoutSchema";

const sampleLayout: ProposalLayoutDocument = {
  version: 1,
  theme: { mainColor: "#7c3aed" },
  containers: [
    {
      id: "intro",
      columns: 1,
      blocks: [
        { column: 0, block: { id: "heading-1", type: "heading", level: 1, text: "Proposal Preview (Proposals 2)" } },
        { column: 0, block: { id: "meta-1", type: "proposal-meta", showIdentifier: true, showProjectName: true } },
        { column: 0, block: { id: "intro-text", type: "paragraph", text: "This page is a Phase 1 test surface for the new container-based renderer." } },
      ],
    },
    {
      id: "body",
      columns: 2,
      blocks: [
        { column: 0, block: { id: "services", type: "services-table", showDescription: true, showQuantity: true } },
        { column: 1, block: { id: "totals", type: "totals" } },
        { column: 1, block: { id: "conditions", type: "conditions", showTimeline: true, showPaymentStructure: true, showPaymentMethods: true, showInstallmentDescription: true, showNotes: true } },
      ],
    },
    {
      id: "acceptance",
      columns: 1,
      blocks: [{ column: 0, block: { id: "accept", type: "acceptance" } }],
    },
  ],
};

const sampleProposal = {
  identifier: "PRO-2026-001",
  status: "sent",
  projects: { name: "Brand Redesign + Website" },
  clients: { name: "Acme Inc." },
  subtotal: 3200,
  discount_type: "percent",
  discount_value: 10,
  timeline_days: 30,
  payment_structure: "installments",
  payment_methods: ["bank transfer", "credit card"],
  installment_description: "50% upfront, 50% on final delivery.",
  conditions_notes: "Includes two revision rounds.",
};

const sampleItems = [
  { id: "1", name: "Brand Strategy", description: "Discovery and direction", quantity: 1, line_total: 1200, currency: "USD" },
  { id: "2", name: "Visual Identity", description: "Logo and style guide", quantity: 1, line_total: 1000, currency: "USD" },
  { id: "3", name: "Landing Page", description: "Responsive implementation", quantity: 1, line_total: 1000, currency: "USD" },
];

export default function ProposalRendererPlayground() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Proposal Renderer Playground</h1>
        <p className="text-sm text-muted-foreground">
          Hardcoded sample document for validating the Proposals 2 layout renderer.
        </p>
        <ProposalRenderer
          proposal={sampleProposal}
          items={sampleItems}
          business={{ business_name: "Lance Studio", business_email: "hello@lance.app" }}
          coverImageUrl={null}
          layout={sampleLayout}
          mode="editor"
        />
      </div>
    </AppLayout>
  );
}
