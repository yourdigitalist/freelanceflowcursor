export type ContractTemplateService = {
  name: string | null;
  description: string | null;
  quantity: number | null;
};

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

export const DEFAULT_CONTRACT_TEMPLATE_CONTENT = `FREELANCE SERVICES AGREEMENT

Contract ID: {{identifier}}
Date: {{today}}

1. Parties
{{client_identification}}
{{freelancer_identification}}

2. Scope of Services
The Service Provider agrees to deliver the following services:
{{services}}
Project reference: {{project_name}}
Estimated timeline: {{timeline_days}}

3. Payment Terms
Total amount: {{total}}
Payment structure: {{payment_structure}}
Accepted payment methods:
{{payment_methods}}
{{installment_description}}
Payment link:
{{payment_link}}

4. Additional Clause
{{additional_clause}}

5. Signatures
Signed on {{signed_date}}.`;

const TOKEN_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;

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

const formatTotal = (total: number | null): string => {
  if (total == null) return "";
  const amount = Number.isFinite(total) ? total : 0;
  const integerPart = Math.floor(Math.abs(amount));
  const formatted = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
  return `${formatted} (${numberToWords(integerPart)} dollars)`;
};

const buildIdentification = (
  entityType: "individual" | "company" | null,
  name: string | null,
  companyName: string | null,
  taxId: string | null,
  companyRegistration: string | null,
  email: string | null,
  phone: string | null,
  address: string | null,
  complement: string | null,
  role: string,
): string => {
  if (entityType === "company") {
    return `${role}: ${companyName || ""}, represented by ${name || ""}, Tax ID ${taxId || ""}, Registration ${companyRegistration || ""}, email ${email || ""}, phone ${phone || ""}, address ${[address, complement].filter(Boolean).join(" ")}`;
  }
  return `${role}: ${name || ""}, Tax ID ${taxId || ""}, email ${email || ""}, phone ${phone || ""}, address ${[address, complement].filter(Boolean).join(" ")}`;
};

const mapTemplateValues = (data: ContractTemplateData): Record<string, string> => {
  const services = data.services
    .map((service) => `- (${Math.max(1, Number(service.quantity || 1))}) ${service.name || ""}: ${service.description || ""}`.trim())
    .join("\n");
  const paymentMethods = data.payment_methods.map((method) => `- ${titleCase(method.replace("other:", "other: "))}`).join("\n");
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
    client_identification: buildIdentification(
      data.client_entity_type,
      data.client_name,
      data.client_company_name,
      data.client_tax_id,
      data.client_company_registration,
      data.client_email,
      data.client_phone,
      data.client_address,
      data.client_complement,
      "CLIENT",
    ),
    freelancer_identification: buildIdentification(
      data.freelancer_company_name ? "company" : "individual",
      data.freelancer_name,
      data.freelancer_company_name,
      data.freelancer_tax_id,
      data.freelancer_company_registration,
      data.freelancer_email,
      data.freelancer_phone,
      data.freelancer_address,
      data.freelancer_complement,
      "SERVICE PROVIDER",
    ),
    services,
    timeline_days: data.timeline_days != null ? `${data.timeline_days} calendar days` : "",
    payment_structure: data.payment_structure === "installments" ? "Installments" : data.payment_structure === "upfront" ? "Upfront" : "",
    payment_methods: paymentMethods,
    installment_description: data.installment_description || "",
    payment_link: data.payment_link || "",
    additional_clause: data.additional_clause || "",
    total: formatTotal(data.total),
  };
};

export function renderTemplate(templateContent: string, data: ContractTemplateData): string {
  const values = mapTemplateValues(data);
  const replaced = templateContent.replace(TOKEN_REGEX, (_full, token: string) => values[token] ?? "");
  return replaced.replace(TOKEN_REGEX, "");
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
