const PAYMENT_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  card: "Credit / debit card",
  cash: "Cash",
  paypal: "PayPal",
  check: "Check",
  other: "Other",
};

export function formatInvoicePaymentMethod(stored: string | null | undefined): string {
  if (!stored) return "";
  if (stored.startsWith("other:")) {
    const custom = stored.slice(6).trim();
    return custom || "Other";
  }
  return PAYMENT_LABELS[stored] ?? stored.replace(/_/g, " ");
}
