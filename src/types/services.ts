export type Service = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  is_recurring: boolean;
  recurrence_period: "monthly" | "annually";
  default_tasks: string[];
  created_at: string;
  updated_at: string;
};

export type ServiceFormData = {
  name: string;
  description?: string;
  price?: number;
  is_recurring: boolean;
  recurrence_period: "monthly" | "annually";
  default_tasks: string[];
};
