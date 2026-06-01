import type { SupabaseClient } from '@supabase/supabase-js';

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
