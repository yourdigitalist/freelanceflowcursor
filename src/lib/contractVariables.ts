export type ContractVariableGroup =
  | "Meta"
  | "Client"
  | "Freelancer"
  | "Project"
  | "Services"
  | "Payment"
  | "Legal";

export type ContractVariableDefinition = {
  tag: string;
  label: string;
  description: string;
  example: string;
  group: ContractVariableGroup;
};

export const CONTRACT_VARIABLES: ContractVariableDefinition[] = [
  { tag: "{{identifier}}", label: "Contract Identifier", description: "Unique contract number.", example: "CTR-2026-0012", group: "Meta" },
  { tag: "{{today}}", label: "Today", description: "Current date (DD/MM/YYYY).", example: "05/05/2026", group: "Meta" },
  { tag: "{{signed_date}}", label: "Signed Date", description: "Signature date (DD/MM/YYYY).", example: "05/05/2026", group: "Meta" },
  { tag: "{{project_name}}", label: "Project Name", description: "Linked project title.", example: "Website Redesign", group: "Project" },
  { tag: "{{client_name}}", label: "Client Name", description: "Client person name.", example: "Alex Johnson", group: "Client" },
  { tag: "{{client_company_name}}", label: "Client Company", description: "Client company legal name.", example: "Acme LLC", group: "Client" },
  { tag: "{{client_tax_id}}", label: "Client Tax ID", description: "Client tax or fiscal number.", example: "12-3456789", group: "Client" },
  { tag: "{{client_company_registration}}", label: "Client Registration", description: "Client company registration.", example: "BR-112233", group: "Client" },
  { tag: "{{client_email}}", label: "Client Email", description: "Client contact email.", example: "client@acme.com", group: "Client" },
  { tag: "{{client_phone}}", label: "Client Phone", description: "Client contact phone.", example: "+1 555 111 2222", group: "Client" },
  { tag: "{{client_address}}", label: "Client Address", description: "Client address line.", example: "123 Main St", group: "Client" },
  { tag: "{{client_complement}}", label: "Client Complement", description: "Additional client address details.", example: "Suite 200", group: "Client" },
  { tag: "{{freelancer_name}}", label: "Freelancer Name", description: "Service provider legal name.", example: "Morgan Lee", group: "Freelancer" },
  { tag: "{{freelancer_company_name}}", label: "Freelancer Company", description: "Service provider company name.", example: "Lee Studio Ltd", group: "Freelancer" },
  { tag: "{{freelancer_tax_id}}", label: "Freelancer Tax ID", description: "Service provider tax ID.", example: "98-7654321", group: "Freelancer" },
  { tag: "{{freelancer_company_registration}}", label: "Freelancer Registration", description: "Service provider registration number.", example: "US-987654", group: "Freelancer" },
  { tag: "{{freelancer_email}}", label: "Freelancer Email", description: "Service provider email.", example: "hello@studio.com", group: "Freelancer" },
  { tag: "{{freelancer_phone}}", label: "Freelancer Phone", description: "Service provider phone.", example: "+1 555 777 9999", group: "Freelancer" },
  { tag: "{{freelancer_address}}", label: "Freelancer Address", description: "Service provider address line.", example: "500 Lake Ave", group: "Freelancer" },
  { tag: "{{freelancer_complement}}", label: "Freelancer Complement", description: "Additional service provider address details.", example: "Apt 4B", group: "Freelancer" },
  { tag: "{{client_identification}}", label: "Client Identification Block", description: "Formatted client identification paragraph.", example: "CLIENT: ...", group: "Client" },
  { tag: "{{freelancer_identification}}", label: "Freelancer Identification Block", description: "Formatted freelancer identification paragraph.", example: "SERVICE PROVIDER: ...", group: "Freelancer" },
  { tag: "{{services}}", label: "Services List", description: "Multi-line list of contract services.", example: "- (1) Design: Landing page", group: "Services" },
  { tag: "{{timeline_days}}", label: "Timeline", description: "Timeline in calendar days.", example: "30 calendar days", group: "Project" },
  { tag: "{{payment_structure}}", label: "Payment Structure", description: "Upfront or Installments.", example: "Installments", group: "Payment" },
  { tag: "{{payment_methods}}", label: "Payment Methods", description: "Bullet list of selected methods.", example: "- Bank Transfer", group: "Payment" },
  { tag: "{{installment_description}}", label: "Installment Description", description: "Installment breakdown text.", example: "50% upfront, 50% on delivery", group: "Payment" },
  { tag: "{{payment_link}}", label: "Payment Link", description: "Optional payment URL.", example: "https://pay.example.com/abc", group: "Payment" },
  { tag: "{{additional_clause}}", label: "Additional Clause", description: "Optional extra legal clause.", example: "Support valid for 30 days.", group: "Legal" },
  { tag: "{{total}}", label: "Contract Total", description: "Currency amount and written value.", example: "$675.00 (six hundred and seventy-five dollars)", group: "Payment" },
];
