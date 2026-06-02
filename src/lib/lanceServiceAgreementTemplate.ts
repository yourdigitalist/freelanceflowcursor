/** Lance-provided Service Agreement template (auto-seeded default), not user-created copies. */

export const LANCE_SERVICE_AGREEMENT_DISCLAIMER_TITLE = "Heads up before you use this template";

export const LANCE_SERVICE_AGREEMENT_DISCLAIMER_BODY =
  "The contract template provided is a starting point only — it's not legal advice and hasn't been reviewed by a lawyer. Laws vary by country and situation, so we recommend having any contract reviewed by a qualified legal professional before sending it to a client.\n\nLance is not responsible for any issues arising from the use of these templates.";

export const LANCE_SERVICE_AGREEMENT_DISCLAIMER_CHECKBOX =
  "I understand and agree — this template is not legal advice and I will use it at my own risk.";

export type LanceServiceAgreementTemplateLike = {
  id?: string;
  name?: string | null;
  is_default?: boolean | null;
  is_lance_template?: boolean | null;
  description?: string | null;
};

export function isLanceProvidedServiceAgreementTemplate(
  template: LanceServiceAgreementTemplateLike | null | undefined,
): boolean {
  if (!template) return false;
  return template.is_lance_template === true;
}

export function resolveDefaultServiceAgreementTemplate<
  T extends LanceServiceAgreementTemplateLike & { id: string; content?: string },
>(templates: T[]): T | undefined {
  return (
    templates.find((t) => t.is_default && isLanceProvidedServiceAgreementTemplate(t)) ||
    templates.find((t) => isLanceProvidedServiceAgreementTemplate(t))
  );
}
