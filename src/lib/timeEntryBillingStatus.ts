/** Billable time entry billing statuses stored on `time_entries.billing_status`. */
export type BillableBillingStatus = 'unbilled' | 'invoiced' | 'billed' | 'paid';

export function getTimeEntryBillingStatusLabel(status: string | null | undefined): string {
  switch ((status || 'unbilled').toLowerCase()) {
    case 'invoiced':
      return 'On invoice';
    case 'billed':
      return 'Invoice sent';
    case 'paid':
      return 'Paid';
    case 'not_billable':
      return 'Not billable';
    default:
      return 'Unbilled';
  }
}

/** Status to set when linking a time entry to an invoice. */
export function billingStatusForInvoiceLink(invoiceStatus: string | null | undefined): BillableBillingStatus {
  const key = (invoiceStatus || 'draft').trim().toLowerCase();
  if (key === 'paid') return 'paid';
  if (key === 'sent' || key === 'overdue' || key === 'reminder_sent') return 'billed';
  return 'invoiced';
}

export function normalizeBillableBillingStatus(value: string | null | undefined): BillableBillingStatus {
  const key = (value || 'unbilled').toLowerCase();
  if (key === 'invoiced' || key === 'billed' || key === 'paid') return key;
  return 'unbilled';
}

/** Statuses that still count as unbilled hours on the dashboard. */
export function isUnbilledBillingStatus(status: string | null | undefined): boolean {
  return (status || 'unbilled').toLowerCase() === 'unbilled';
}
