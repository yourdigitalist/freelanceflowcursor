import type { SupabaseClient } from '@supabase/supabase-js';

export const INVOICE_PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Credit / debit card' },
  { value: 'cash', label: 'Cash' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
] as const;

export type InvoicePaymentMethodValue = (typeof INVOICE_PAYMENT_METHODS)[number]['value'];

export function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function paidDateInputToIso(dateInput: string): string {
  const trimmed = dateInput.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date().toISOString();
  }
  return new Date(`${trimmed}T12:00:00`).toISOString();
}

export function resolvePaymentMethodForSave(method: string, otherText?: string): string {
  if (method === 'other') {
    const custom = (otherText || '').trim();
    return custom ? `other: ${custom}` : 'other';
  }
  return method;
}

export function formatInvoicePaymentMethod(stored: string | null | undefined): string {
  if (!stored) return '';
  if (stored.startsWith('other:')) {
    const custom = stored.slice(6).trim();
    return custom || 'Other';
  }
  const match = INVOICE_PAYMENT_METHODS.find((m) => m.value === stored);
  return match?.label ?? stored.replace(/_/g, ' ');
}

export type MarkInvoicePaidInput = {
  paidDate: string;
  paymentMethod: string;
  paymentMethodOther?: string;
};

export async function markInvoicePaid(
  supabase: SupabaseClient,
  invoiceId: string,
  input: MarkInvoicePaidInput,
): Promise<void> {
  const paidAt = paidDateInputToIso(input.paidDate);
  const payment_method = resolvePaymentMethodForSave(input.paymentMethod, input.paymentMethodOther);

  const payload = {
    status: 'paid' as const,
    paid_date: paidAt,
    payment_method,
  };

  const { error: withPayment } = await supabase.from('invoices').update(payload).eq('id', invoiceId);

  if (!withPayment) {
    await markLinkedTimeEntriesPaid(supabase, invoiceId);
    return;
  }

  if (/payment_method/i.test(withPayment.message)) {
    const { error: withoutMethod } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_date: paidAt })
      .eq('id', invoiceId);
    if (withoutMethod) throw withoutMethod;
    await markLinkedTimeEntriesPaid(supabase, invoiceId);
    return;
  }

  if (/paid_date/i.test(withPayment.message)) {
    const { error: statusOnly } = await supabase
      .from('invoices')
      .update({ status: 'paid', payment_method })
      .eq('id', invoiceId);
    if (statusOnly) throw statusOnly;
    await markLinkedTimeEntriesPaid(supabase, invoiceId);
    return;
  }

  throw withPayment;
}

async function markLinkedTimeEntriesPaid(supabase: SupabaseClient, invoiceId: string): Promise<void> {
  const { error: entriesError } = await supabase
    .from('time_entries')
    .update({ billing_status: 'paid' })
    .eq('invoice_id', invoiceId);
  if (entriesError) throw entriesError;
}

export function buildReceiptEmailMessage(input: {
  totalFormatted: string;
  paidDateDisplay: string;
  paymentMethodDisplay: string;
}): string {
  const lines = [
    'This invoice has been paid in full.',
    `Amount paid: ${input.totalFormatted}`,
    `Payment date: ${input.paidDateDisplay}`,
  ];
  if (input.paymentMethodDisplay) {
    lines.push(`Payment method: ${input.paymentMethodDisplay}`);
  }
  lines.push('', 'Thank you for your business.');
  return lines.join('\n');
}
