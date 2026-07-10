import type { SupabaseClient } from '@supabase/supabase-js';

/** Invoice statuses that represent an outstanding (unpaid) invoice sent to the client. */
export const OUTSTANDING_INVOICE_STATUSES = ['sent', 'overdue', 'reminder_sent'] as const;

export function isOutstandingInvoiceStatus(status: string | null | undefined): boolean {
  const key = (status || '').trim().toLowerCase();
  return (OUTSTANDING_INVOICE_STATUSES as readonly string[]).includes(key);
}

/** Whether the user can send a payment reminder email for this invoice. */
export function canSendPaymentReminder(status: string | null | undefined): boolean {
  const key = (status || '').trim().toLowerCase();
  return key === 'sent' || key === 'overdue' || key === 'reminder_sent' || key === 'paid';
}

/** Revert a sent invoice to draft so it can be edited and re-sent to the client. */
export async function revertSentInvoiceToDraft(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'draft' })
    .eq('id', invoiceId);

  if (error) throw error;
}

/** Revert a mistakenly paid invoice to sent and restore linked time entries to billed. */
export async function reopenPaidInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({ status: 'sent', paid_date: null, payment_method: null })
    .eq('id', invoiceId);

  if (invoiceError) {
    if (/paid_date|payment_method/i.test(invoiceError.message)) {
      const { error: statusOnly } = await supabase
        .from('invoices')
        .update({ status: 'sent', paid_date: null })
        .eq('id', invoiceId);
      if (statusOnly) throw statusOnly;
    } else {
      throw invoiceError;
    }
  }

  const { error: entriesError } = await supabase
    .from('time_entries')
    .update({ billing_status: 'billed' })
    .eq('invoice_id', invoiceId)
    .eq('billing_status', 'paid');

  if (entriesError) throw entriesError;
}
