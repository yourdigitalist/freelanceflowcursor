/** Invoice number format tags and presets for settings + preview. */

export type InvoiceNumberReset = 'never' | 'yearly' | 'monthly';

export const INVOICE_NUMBER_FORMAT_TAGS = [
  { tag: '{{number}}', label: 'Number (in reset period)' },
  { tag: '{{month}}', label: 'Month (MM)' },
  { tag: '{{year}}', label: 'Year (YYYY)' },
  { tag: '{{yy}}', label: 'Year (YY)' },
  { tag: '{{prefix}}', label: 'Prefix' },
] as const;

export type InvoiceNumberFormatPreset = {
  id: string;
  label: string;
  description: string;
  format: string;
  reset: InvoiceNumberReset;
  padding: number;
  /** Suggested prefix when applying this preset; null = leave unchanged */
  prefix?: string | null;
};

export const INVOICE_NUMBER_FORMAT_PRESETS: InvoiceNumberFormatPreset[] = [
  {
    id: 'monthly_slash',
    label: 'Monthly · number/month/year',
    description: '02/08/2026 — sequence resets each month',
    format: '{{number}}/{{month}}/{{year}}',
    reset: 'monthly',
    padding: 2,
    prefix: '',
  },
  {
    id: 'inv_year_number',
    label: 'INV + year + number',
    description: 'INV20260001',
    format: '{{prefix}}{{year}}{{number}}',
    reset: 'yearly',
    padding: 4,
    prefix: 'INV',
  },
  {
    id: 'inv_year_dash',
    label: 'INV-year-number',
    description: 'INV-2026-0001',
    format: '{{prefix}}-{{year}}-{{number}}',
    reset: 'yearly',
    padding: 4,
    prefix: 'INV',
  },
  {
    id: 'year_month_number',
    label: 'Year/month/number',
    description: '2026/08/0001 — sequence resets each month',
    format: '{{year}}/{{month}}/{{number}}',
    reset: 'monthly',
    padding: 4,
    prefix: '',
  },
  {
    id: 'prefix_number',
    label: 'Prefix + number',
    description: 'INV0001',
    format: '{{prefix}}{{number}}',
    reset: 'never',
    padding: 4,
    prefix: 'INV',
  },
  {
    id: 'number_only',
    label: 'Number only',
    description: '0001',
    format: '{{number}}',
    reset: 'never',
    padding: 4,
    prefix: '',
  },
];

export const INVOICE_DUE_DAYS_PRESETS = [
  { days: 0, label: 'Due on receipt', description: 'Same day as issue date' },
  { days: 7, label: 'Net 7', description: '7 days after issue' },
  { days: 14, label: 'Net 14', description: '14 days after issue' },
  { days: 15, label: 'Net 15', description: '15 days after issue' },
  { days: 30, label: 'Net 30', description: '30 days after issue' },
  { days: 45, label: 'Net 45', description: '45 days after issue' },
  { days: 60, label: 'Net 60', description: '60 days after issue' },
] as const;

export function matchInvoiceDueDaysPreset(days: number): string {
  const found = INVOICE_DUE_DAYS_PRESETS.find((p) => p.days === days);
  return found ? String(found.days) : 'custom';
}

export function legacyInvoiceNumberFormat(includeYear: boolean): string {
  return includeYear ? '{{prefix}}{{year}}{{number}}' : '{{prefix}}{{number}}';
}

export function previewInvoiceNumber(options: {
  format: string;
  prefix?: string | null;
  padding?: number | null;
  nextNumber?: number | null;
  date?: Date;
}): string {
  const date = options.date ?? new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const padding = Math.min(6, Math.max(1, options.padding ?? 4));
  const nextNumber = Math.max(1, options.nextNumber ?? 1);
  const prefix = (options.prefix ?? 'INV').trim();
  const fmt = (options.format || '').trim() || legacyInvoiceNumberFormat(true);

  return fmt
    .replace(/\{\{prefix\}\}/gi, prefix)
    .replace(/\{\{year\}\}/gi, String(year))
    .replace(/\{\{yy\}\}/gi, String(year).slice(-2))
    .replace(/\{\{month\}\}/gi, String(month).padStart(2, '0'))
    .replace(/\{\{number\}\}/gi, String(nextNumber).padStart(padding, '0'));
}

export function matchInvoiceFormatPreset(format: string | null | undefined): string {
  const normalized = (format || '').trim();
  if (!normalized) return 'inv_year_number';
  const found = INVOICE_NUMBER_FORMAT_PRESETS.find((p) => p.format === normalized);
  return found?.id ?? 'custom';
}

/** Postgres unique violation on (user_id, invoice_number) */
export function isDuplicateInvoiceNumberError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '23505') {
    return /invoice_number|invoices_user_id_invoice_number/i.test(e.message || '');
  }
  return /duplicate key|already exists/i.test(e.message || '') && /invoice_number/i.test(e.message || '');
}
