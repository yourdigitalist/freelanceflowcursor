import { DEFAULT_CONTRACT_TEMPLATE_CONTENT } from "@/lib/contractTemplate";

export type ContractTemplateRow = {
  id: string;
  name: string;
  content: string;
  is_default?: boolean | null;
};

/** Same template pick order as ContractDetail when template_id is unset. */
export function resolveContractTemplateContent(
  templateId: string | null | undefined,
  templates: ContractTemplateRow[],
): string {
  if (templateId) {
    const selected = templates.find((t) => t.id === templateId);
    return selected?.content || DEFAULT_CONTRACT_TEMPLATE_CONTENT;
  }
  const serviceAgreement = templates.find((t) => t.name?.trim().toLowerCase() === "service agreement");
  const defaultTemplate = serviceAgreement || templates.find((t) => t.is_default) || templates[0];
  return defaultTemplate?.content || DEFAULT_CONTRACT_TEMPLATE_CONTENT;
}
