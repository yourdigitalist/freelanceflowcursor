export type ContractTemplateService = {
  name: string | null;
  description: string | null;
  quantity: number | null;
  price?: number | null;
};

import { DEFAULT_SERVICE_AGREEMENT_TEMPLATE_HTML } from "@/lib/defaultServiceAgreementTemplate.html";

export type ContractTemplateData = {
  identifier: string | null;
  today: string | null;
  signed_date: string | null;
  project_name: string | null;
  client_entity_type: "individual" | "company" | null;
  client_name: string | null;
  client_company_name: string | null;
  client_tax_id: string | null;
  client_company_registration: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_complement: string | null;
  freelancer_name: string | null;
  freelancer_company_name: string | null;
  freelancer_tax_id: string | null;
  freelancer_company_registration: string | null;
  freelancer_email: string | null;
  freelancer_phone: string | null;
  freelancer_address: string | null;
  freelancer_complement: string | null;
  services: ContractTemplateService[];
  timeline_days: number | null;
  payment_structure: "upfront" | "installments" | null;
  payment_methods: string[];
  installment_description: string | null;
  payment_link: string | null;
  additional_clause: string | null;
  total: number | null;
};

export type RenderTemplateOptions = {
  /** preview = highlighted placeholders for drafting; final = clean document for clients/PDF */
  mode?: "preview" | "final";
  currency?: string;
};

export const DEFAULT_CONTRACT_TEMPLATE_CONTENT = DEFAULT_SERVICE_AGREEMENT_TEMPLATE_HTML;

export const CONTRACT_DOCUMENT_STYLES = `
  .contract-document {
    font-size: 15px;
    line-height: 1.6;
    color: #27272a;
  }
  .contract-document h1 {
    margin: 0 0 10px;
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.25;
    color: #1a1a2e;
  }
  .contract-document h2 {
    margin: 22px 0 10px;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.3;
    color: #1a1a2e;
  }
  .contract-document h2:first-child {
    margin-top: 0;
  }
  .contract-document h3 {
    margin: 16px 0 8px;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a2e;
  }
  .contract-document h4 {
    margin: 14px 0 6px;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a1a2e;
  }
  .contract-document p {
    margin: 0 0 8px;
  }
  .contract-document p:empty {
    display: none;
  }
  .contract-document ul,
  .contract-document ol {
    margin: 0 0 10px;
    padding-left: 1.25rem;
  }
  .contract-document li {
    margin-bottom: 3px;
  }
  .contract-token {
    display: inline;
    padding: 1px 5px;
    border-radius: 4px;
    background: #e8f0fe;
    color: #1d4ed8;
    font-weight: 600;
    font-size: 0.92em;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .contract-token-line {
    display: inline-block;
    margin-bottom: 2px;
  }
  .contract-services-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 14px;
  }
  .contract-services-table th {
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: #888;
    padding: 8px 12px;
    border-bottom: 1px solid #e7e0f4;
  }
  .contract-services-table th:nth-child(3),
  .contract-services-table th:nth-child(4),
  .contract-services-table td:nth-child(3),
  .contract-services-table td:nth-child(4) {
    text-align: right;
  }
  .contract-services-table td {
    padding: 14px 12px;
    vertical-align: top;
    border-bottom: 1px solid #e7e0f4;
    color: #333;
  }
  .contract-services-table td:first-child {
    font-weight: 500;
    color: #1a1a2e;
  }
  .contract-services-table td:nth-child(2) {
    color: #888;
    font-size: 13px;
  }
  .contract-services-table td:nth-child(4) {
    font-weight: 500;
    color: #9b63e9;
    font-variant-numeric: tabular-nums;
  }
  .contract-party-block {
    margin: 0 0 12px;
  }
  .contract-party-title {
    margin: 0 0 5px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
  }
  .contract-party-details {
    margin: 0;
    padding: 0 0 0 1.1rem;
    list-style: none;
  }
  .contract-party-details li {
    margin: 0 0 5px;
    padding: 0;
    line-height: 1.45;
    font-size: 14px;
    color: #333;
  }
  .contract-party-field-label {
    display: inline-block;
    min-width: 6.5rem;
    font-weight: 600;
    color: #555;
  }
  .contract-party-field-value {
    color: #1a1a2e;
  }
  .contract-party-details .contract-token {
    padding: 1px 4px;
  }
  .contract-party-empty {
    margin: 0;
    font-size: 14px;
    color: #888;
    font-style: italic;
  }
`;

const TOKEN_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;

const HIDDEN_WHEN_EMPTY_TOKENS = new Set(["payment_link"]);

const formatDate = (input?: string | null): string => {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const titleCase = (value: string): string =>
  value
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");

const numberToWordsUnder1000 = (value: number): string => {
  const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  if (value < 10) return ones[value];
  if (value < 20) return teens[value - 10];
  if (value < 100) {
    const rest = value % 10;
    return rest === 0 ? tens[Math.floor(value / 10)] : `${tens[Math.floor(value / 10)]}-${ones[rest]}`;
  }
  const rest = value % 100;
  const hundred = `${ones[Math.floor(value / 100)]} hundred`;
  return rest === 0 ? hundred : `${hundred} and ${numberToWordsUnder1000(rest)}`;
};

const numberToWords = (value: number): string => {
  if (value < 1000) return numberToWordsUnder1000(value);
  if (value < 1000000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    return rest === 0 ? `${numberToWordsUnder1000(thousands)} thousand` : `${numberToWordsUnder1000(thousands)} thousand ${numberToWordsUnder1000(rest)}`;
  }
  return String(value);
};

const formatTotal = (total: number | null, currency: string): string => {
  if (total == null) return "";
  const amount = Number.isFinite(total) ? total : 0;
  const integerPart = Math.floor(Math.abs(amount));
  const formatted = new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  return `${formatted} (${numberToWords(integerPart)} dollars)`;
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount || 0);

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export type PartyIdentificationFields = {
  entityType: "individual" | "company" | null;
  name: string | null;
  companyName: string | null;
  taxId: string | null;
  companyRegistration: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  complement?: string | null;
};

const pushPartyRow = (
  rows: Array<{ label: string; value: string }>,
  label: string,
  value: string | null | undefined,
) => {
  const trimmed = String(value || "").trim();
  if (trimmed) rows.push({ label, value: trimmed });
};

/** Structured party block (template supplies CLIENT / SERVICE PROVIDER heading). */
export function buildPartyIdentificationHtml(
  fields: PartyIdentificationFields,
  mode: "preview" | "final" = "final",
): string {
  const addressLine = [fields.address, fields.complement]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  const rows: Array<{ label: string; value: string }> = [];
  const companyName = String(fields.companyName || "").trim();
  const personName = String(fields.name || "").trim();

  if (fields.entityType === "company") {
    const company = companyName || personName;
    pushPartyRow(rows, "Company", company);
    if (personName && personName !== company) {
      pushPartyRow(rows, "Representative", personName);
    }
    pushPartyRow(rows, "Registration", fields.companyRegistration);
  } else {
    pushPartyRow(rows, "Name", fields.name);
    pushPartyRow(rows, "Company", companyName);
  }

  pushPartyRow(rows, "Tax ID", fields.taxId);
  pushPartyRow(rows, "Email", fields.email);
  pushPartyRow(rows, "Phone", fields.phone);
  pushPartyRow(rows, "Address", addressLine);

  if (!rows.length) {
    return `<p class="contract-party-empty">Not provided</p>`;
  }

  const valueClass =
    mode === "preview" ? "contract-party-field-value contract-token" : "contract-party-field-value";

  const items = rows
    .map(
      ({ label, value }) =>
        `<li><span class="contract-party-field-label">${escapeHtml(label)}</span> <span class="${valueClass}">${escapeHtml(value)}</span></li>`,
    )
    .join("");

  return `<ul class="contract-party-details">${items}</ul>`;
};

export function buildContractServicesTableHtml(
  services: ContractTemplateService[],
  currency = "USD",
): string {
  const rows = services
    .filter((service) => Boolean(String(service.name || "").trim()))
    .map((service) => {
      const qty = Math.max(1, Math.round(Number(service.quantity || 1)));
      const unitPrice = Number(service.price || 0);
      const lineTotal = qty * unitPrice;
      return `<tr>
        <td>${escapeHtml(service.name || "")}</td>
        <td>${escapeHtml(service.description || "—")}</td>
        <td>${qty}</td>
        <td>${escapeHtml(formatMoney(lineTotal, currency))}</td>
      </tr>`;
    })
    .join("");

  if (!rows) {
    return `<p class="text-sm text-muted-foreground">No services listed.</p>`;
  }

  return `<table class="contract-services-table">
    <thead>
      <tr>
        <th>Service</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

const wrapPreviewToken = (value: string): string => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return `<span class="contract-token">${escapeHtml(normalized)}</span>`;
  }

  return lines
    .map((line) => `<span class="contract-token contract-token-line">${escapeHtml(line)}</span>`)
    .join("<br>");
};

const wrapFinalToken = (value: string): string => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";
  return escapeHtml(normalized).replace(/\n/g, "<br>");
};

/** Remove paragraphs left empty after merge tags; keep Quill spacer lines (`<p><br></p>`). */
const stripEmptyParagraphs = (html: string): string =>
  html.replace(/<p[^>]*>\s*<\/p>/gi, "");

const mapTemplateValues = (data: ContractTemplateData, currency: string): Record<string, string> => {
  const paymentMethods = data.payment_methods
    .map((method) => `- ${titleCase(method.replace(/^other:\s*/i, "other: "))}`)
    .join("\n");
  const today = formatDate(data.today);
  const signedDate = formatDate(data.signed_date);
  return {
    identifier: data.identifier || "",
    today,
    signed_date: signedDate,
    project_name: data.project_name || "",
    client_name: data.client_name || "",
    client_company_name: data.client_company_name || "",
    client_tax_id: data.client_tax_id || "",
    client_company_registration: data.client_company_registration || "",
    client_email: data.client_email || "",
    client_phone: data.client_phone || "",
    client_address: data.client_address || "",
    client_complement: data.client_complement || "",
    freelancer_name: data.freelancer_name || "",
    freelancer_company_name: data.freelancer_company_name || "",
    freelancer_tax_id: data.freelancer_tax_id || "",
    freelancer_company_registration: data.freelancer_company_registration || "",
    freelancer_email: data.freelancer_email || "",
    freelancer_phone: data.freelancer_phone || "",
    freelancer_address: data.freelancer_address || "",
    freelancer_complement: data.freelancer_complement || "",
    client_identification: "",
    freelancer_identification: "",
    services: "",
    timeline_days: data.timeline_days != null ? `${data.timeline_days} calendar days` : "",
    payment_structure:
      data.payment_structure === "installments"
        ? "Payment structure: Installments"
        : data.payment_structure === "upfront"
          ? "Payment structure: Upfront (single payment)"
          : "",
    payment_methods: paymentMethods,
    installment_description: data.installment_description || "",
    payment_link: data.payment_link?.trim() || "",
    additional_clause: data.additional_clause || "",
    total: formatTotal(data.total, currency),
  };
};

export function renderTemplate(
  templateContent: string,
  data: ContractTemplateData,
  options: RenderTemplateOptions = {},
): string {
  const mode = options.mode ?? "preview";
  const currency = options.currency || "USD";
  const values = mapTemplateValues(data, currency);
  const wrap = mode === "final" ? wrapFinalToken : wrapPreviewToken;

  let html = templateContent.replace(TOKEN_REGEX, (full, token: string) => {
    if (token === "services") {
      return buildContractServicesTableHtml(data.services, currency);
    }

    if (token === "client_identification") {
      return buildPartyIdentificationHtml(
        {
          entityType: data.client_entity_type || "individual",
          name: data.client_name,
          companyName: data.client_company_name,
          taxId: data.client_tax_id,
          companyRegistration: data.client_company_registration,
          email: data.client_email,
          phone: data.client_phone,
          address: data.client_address,
          complement: data.client_complement,
        },
        mode,
      );
    }

    if (token === "freelancer_identification") {
      return buildPartyIdentificationHtml(
        {
          entityType: data.freelancer_company_name ? "company" : "individual",
          name: data.freelancer_name,
          companyName: data.freelancer_company_name,
          taxId: data.freelancer_tax_id,
          companyRegistration: data.freelancer_company_registration,
          email: data.freelancer_email,
          phone: data.freelancer_phone,
          address: data.freelancer_address,
          complement: data.freelancer_complement,
        },
        mode,
      );
    }

    const value = values[token];
    const trimmed = typeof value === "string" ? value.trim() : "";

    if (!trimmed) {
      if (mode === "final" || HIDDEN_WHEN_EMPTY_TOKENS.has(token)) {
        return "";
      }
      return full;
    }

    return wrap(value);
  });

  html = stripEmptyParagraphs(html);
  return html;
}

export type ContractSection = {
  heading: string;
  clauses: string[];
};

export type GenerateContractSectionsInput = {
  clientName: string;
  clientCompany: string | null;
  clientEntityType: "individual" | "company";
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  freelancerName: string;
  freelancerCompany: string | null;
  freelancerAddress: string;
  freelancerEmail: string;
  freelancerPhone: string;
  services: Array<{ name: string }>;
  timelineDays: number | null;
  paymentStructure: string | null;
  paymentMethods: string[];
  installmentDescription: string | null;
  total: number;
  identifier: string | null;
  projectName: string | null;
  additionalClause: string | null;
  freelancerCity?: string | null;
  freelancerCountry?: string | null;
  clientTaxId?: string | null;
  freelancerTaxId?: string | null;
};

const formatPaymentMethod = (method: string) => {
  if (method.startsWith("other:")) return method.replace("other:", "Other:").trim();
  return method
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export function generateContractSections(input: GenerateContractSectionsInput): ContractSection[] {
  const servicesText = input.services.length
    ? input.services.map((service) => service.name).filter(Boolean).join(", ")
    : "services described by the parties";
  const projectText = input.projectName || "not specified project";
  const contractId = input.identifier || "to be assigned";
  const totalText = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(input.total || 0));
  const methodsText = input.paymentMethods.length ? input.paymentMethods.map(formatPaymentMethod).join(" - ") : "to be defined";
  const timelineText = input.timelineDays ? `${input.timelineDays} calendar days` : "timeline to be aligned in writing";
  const paymentStructureText =
    input.paymentStructure === "installments"
      ? "in installments"
      : input.paymentStructure === "upfront"
      ? "in a single payment"
      : "under payment conditions agreed by the parties";

  const clientRole = input.clientEntityType === "company" ? "acting as company" : "acting as individual";
  const clientCompanyLine = input.clientCompany ? `CLIENT COMPANY: ${input.clientCompany}.` : "";
  const freelancerCompanyLine = input.freelancerCompany ? `SERVICE PROVIDER COMPANY: ${input.freelancerCompany}.` : "";

  const sections: ContractSection[] = [
    {
      heading: "IDENTIFICATION OF THE CONTRACTING PARTIES",
      clauses: [
        `CLIENT: ${input.clientName}, ${clientRole}, with contact email ${input.clientEmail}, phone ${input.clientPhone}, and address at ${input.clientAddress}.`,
        clientCompanyLine,
        `SERVICE PROVIDER: ${input.freelancerName}, with contact email ${input.freelancerEmail}, phone ${input.freelancerPhone}, and address at ${input.freelancerAddress}.`,
        freelancerCompanyLine,
        `The parties identified above enter into this Freelance Services Agreement for project ${projectText} under contract identifier ${contractId}.`,
      ].filter(Boolean),
    },
    {
      heading: "SCOPE OF WORK",
      clauses: [
        `Clause 1. The SERVICE PROVIDER agrees to deliver the following services: ${servicesText}.`,
        `Clause 2. The estimated delivery timeline is ${timelineText}.`,
      ],
    },
    {
      heading: "PAYMENT TERMS",
      clauses: [
        `Clause 3. The CONTRACTING PARTY agrees to pay the total amount of ${totalText} ${paymentStructureText}.`,
        `Clause 4. Accepted payment methods: ${methodsText}.`,
        input.installmentDescription ? `Clause 5. Installment details: ${input.installmentDescription}.` : "",
      ].filter(Boolean),
    },
    {
      heading: "GENERAL CONDITIONS",
      clauses: [
        input.additionalClause ? `Clause 6. Additional clause: ${input.additionalClause}.` : "",
        "Clause 7. This agreement is legally binding upon both parties from the moment of signature.",
      ].filter(Boolean),
    },
  ];

  return sections;
}
