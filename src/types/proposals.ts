export type ProposalStatus = "draft" | "sent" | "read" | "accepted" | "archived";
export type DiscountType = "amount" | "percent";
export type PaymentStructure = "upfront" | "installments";

export type Proposal = {
  id: string;
  user_id: string;
  client_id: string;
  project_id: string | null;
  identifier: string;
  status: ProposalStatus;
  public_token: string;
  objective: string | null;
  presentation: string | null;
  validity_days: number;
  expires_at: string | null;
  cover_image_url: string | null;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  total: number;
  availability_required: boolean;
  timeline_days: number | null;
  payment_structure: PaymentStructure | null;
  payment_methods: string[];
  installment_description: string | null;
  conditions_notes: string | null;
  sent_at: string | null;
  read_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProposalService = {
  id: string;
  proposal_id: string;
  service_id: string | null;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  is_recurring: boolean;
  recurrence_period: "monthly" | "annually";
  quantity: number;
  position: number;
  line_total: number;
  created_at: string;
};
