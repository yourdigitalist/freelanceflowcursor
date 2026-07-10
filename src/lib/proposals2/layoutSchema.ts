import { z } from "zod";

const textStyleSchema = z.object({
  fontSize: z.number().min(10).max(72).default(16),
  color: z.string().default("#1a1a2e"),
  fontWeight: z.union([z.literal("normal"), z.literal("medium"), z.literal("semibold"), z.literal("bold")]).default("normal"),
  fontFamily: z.string().default("inherit"),
  textAlign: z.union([z.literal("left"), z.literal("center"), z.literal("right")]).default("left"),
});

const proposalHeadingBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("heading"),
  text: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  style: textStyleSchema.default({
    fontSize: 32,
    color: "#1a1a2e",
    fontWeight: "semibold",
    fontFamily: "inherit",
    textAlign: "left",
  }),
});

const proposalParagraphBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("paragraph"),
  text: z.string().default(""),
  style: textStyleSchema.default({
    fontSize: 16,
    color: "#333333",
    fontWeight: "normal",
    fontFamily: "inherit",
    textAlign: "left",
  }),
});

const proposalImageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("image"),
  src: z.string().default(""),
  alt: z.string().default("Proposal image"),
  radius: z.number().min(0).max(48).default(12),
});

const dividerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("divider"),
  color: z.string().default("#e7e0f4"),
  thickness: z.number().min(1).max(8).default(1),
});

const proposalMetaBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("proposal-meta"),
  showIdentifier: z.boolean().default(true),
  showProjectName: z.boolean().default(true),
});

const clientBusinessBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("client-business"),
});

const servicesTableBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("services-table"),
  showDescription: z.boolean().default(true),
  showQuantity: z.boolean().default(true),
});

const totalsBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("totals"),
});

const conditionsBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("conditions"),
  showTimeline: z.boolean().default(true),
  showPaymentStructure: z.boolean().default(true),
  showPaymentMethods: z.boolean().default(true),
  showInstallmentDescription: z.boolean().default(true),
  showNotes: z.boolean().default(true),
});

const acceptanceBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("acceptance"),
});

const spacerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("spacer"),
  size: z.union([z.literal("sm"), z.literal("md"), z.literal("lg")]).default("md"),
});

export const proposalBlockSchema = z.discriminatedUnion("type", [
  proposalHeadingBlockSchema,
  proposalParagraphBlockSchema,
  proposalImageBlockSchema,
  dividerBlockSchema,
  proposalMetaBlockSchema,
  clientBusinessBlockSchema,
  servicesTableBlockSchema,
  totalsBlockSchema,
  conditionsBlockSchema,
  acceptanceBlockSchema,
  spacerBlockSchema,
]);

export const proposalContainerSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  columns: z.union([z.literal(1), z.literal(2)]).default(1),
  style: z.object({
    backgroundColor: z.string().default("#ffffff"),
    padding: z.number().min(0).max(96).default(16),
    radius: z.number().min(0).max(32).default(12),
  }).default({
    backgroundColor: "#ffffff",
    padding: 16,
    radius: 12,
  }),
  blocks: z
    .array(
      z.object({
        column: z.union([z.literal(0), z.literal(1)]).default(0),
        block: proposalBlockSchema,
      }),
    )
    .default([]),
});

export const proposalThemeSchema = z.object({
  mainColor: z.string().default("#9b63e9"),
});

export const proposalLayoutDocumentSchema = z.object({
  version: z.literal(1),
  theme: proposalThemeSchema.default({ mainColor: "#9b63e9" }),
  containers: z.array(proposalContainerSchema).min(1),
});

export type ProposalLayoutBlock = z.infer<typeof proposalBlockSchema>;
export type ProposalLayoutContainer = z.infer<typeof proposalContainerSchema>;
export type ProposalLayoutDocument = z.infer<typeof proposalLayoutDocumentSchema>;

export function parseProposalLayoutDocument(
  input: unknown,
): ProposalLayoutDocument | null {
  if (!input) return null;
  const parsed = proposalLayoutDocumentSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
