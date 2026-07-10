import type { ProposalLayoutBlock, ProposalLayoutContainer } from "@/lib/proposals2/layoutSchema";

export type NewBlockType = ProposalLayoutBlock["type"];

export const createId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const blockTypeLabels: Record<NewBlockType, string> = {
  heading: "Text",
  paragraph: "Paragraph",
  image: "Image",
  divider: "Divider",
  "proposal-meta": "Proposal details",
  "client-business": "Client & business",
  "services-table": "Services",
  totals: "Totals",
  conditions: "Conditions",
  acceptance: "Acceptance",
  spacer: "Spacer",
};

export const paletteItems: Array<{ type: NewBlockType; label: string; description: string }> = [
  { type: "heading", label: "Text", description: "Heading or paragraph" },
  { type: "image", label: "Image", description: "Add a photo or graphic" },
  { type: "divider", label: "Divider", description: "Separate content" },
  { type: "spacer", label: "Spacer", description: "Add vertical space" },
  { type: "services-table", label: "Services", description: "Package & pricing table" },
  { type: "proposal-meta", label: "Proposal details", description: "ID and project name" },
  { type: "client-business", label: "Parties", description: "Client and business info" },
  { type: "totals", label: "Totals", description: "Subtotal and total" },
  { type: "conditions", label: "Conditions", description: "Timeline and payment terms" },
  { type: "acceptance", label: "Acceptance", description: "Client acceptance block" },
];

export function getContainerDisplayName(container: ProposalLayoutContainer, index: number) {
  return container.title?.trim() || `Section ${index + 1}`;
}

export function createBlock(type: NewBlockType): ProposalLayoutBlock {
  const id = createId(type);
  switch (type) {
    case "heading":
      return {
        id,
        type,
        level: 2,
        text: "Add your heading",
        style: { fontSize: 32, color: "#1a1a2e", fontWeight: "semibold", fontFamily: "inherit", textAlign: "left" },
      };
    case "paragraph":
      return {
        id,
        type,
        text: "Add your text here.",
        style: { fontSize: 16, color: "#333333", fontWeight: "normal", fontFamily: "inherit", textAlign: "left" },
      };
    case "image":
      return { id, type, src: "", alt: "Proposal image", radius: 12 };
    case "divider":
      return { id, type, color: "#e7e0f4", thickness: 1 };
    case "proposal-meta":
      return { id, type, showIdentifier: true, showProjectName: true };
    case "client-business":
      return { id, type };
    case "services-table":
      return { id, type, showDescription: true, showQuantity: true };
    case "totals":
      return { id, type };
    case "conditions":
      return {
        id,
        type,
        showTimeline: true,
        showPaymentStructure: true,
        showPaymentMethods: true,
        showInstallmentDescription: true,
        showNotes: true,
      };
    case "acceptance":
      return { id, type };
    case "spacer":
      return { id, type, size: "md" };
    default:
      return {
        id,
        type: "paragraph",
        text: "Add your text here.",
        style: { fontSize: 16, color: "#333333", fontWeight: "normal", fontFamily: "inherit", textAlign: "left" },
      };
  }
}

export function createContainer(sectionNumber: number): ProposalLayoutContainer {
  return {
    id: createId("section"),
    title: `Section ${sectionNumber}`,
    columns: 1,
    style: { backgroundColor: "#ffffff", padding: 16, radius: 12 },
    blocks: [],
  };
}
