export type GuideItemId =
  | 'companyProfile'
  | 'uploadLogo'
  | 'customizeInvoices'
  | 'firstClient'
  | 'firstProject';

/** DB default and UI placeholder — not user customization */
const FACTORY_INVOICE_PREFIXES = new Set(['', 'INV', 'INV-']);

export type InvoiceCustomizationProfile = {
  invoice_footer?: string | null;
  invoice_notes_default?: string | null;
  invoice_bank_details_default?: string | null;
  invoice_email_subject_default?: string | null;
  invoice_email_message_default?: string | null;
  reminder_subject_default?: string | null;
  reminder_body_default?: string | null;
  reminder_enabled?: boolean | null;
  hourly_rate?: number | null;
  invoice_prefix?: string | null;
  invoice_include_year?: boolean | null;
  invoice_number_reset_yearly?: boolean | null;
  invoice_number_start?: number | null;
  invoice_number_padding?: number | null;
  reminder_days_before?: number | null;
};

export function profileHasInvoiceCustomization(
  profile: InvoiceCustomizationProfile | null | undefined,
  taxCount: number,
): boolean {
  const prefix = (profile?.invoice_prefix || '').trim();
  const hasNonDefaultPrefix = !!prefix && !FACTORY_INVOICE_PREFIXES.has(prefix);

  return !!(
    (profile?.invoice_footer || '').trim() ||
    (profile?.invoice_notes_default || '').trim() ||
    (profile?.invoice_bank_details_default || '').trim() ||
    (profile?.invoice_email_subject_default || '').trim() ||
    (profile?.invoice_email_message_default || '').trim() ||
    (profile?.reminder_subject_default || '').trim() ||
    (profile?.reminder_body_default || '').trim() ||
    profile?.reminder_enabled === true ||
    (profile?.hourly_rate != null && Number(profile.hourly_rate) > 0) ||
    hasNonDefaultPrefix ||
    profile?.invoice_include_year === false ||
    profile?.invoice_number_reset_yearly === false ||
    (profile?.invoice_number_start != null && profile.invoice_number_start !== 1) ||
    (profile?.invoice_number_padding != null && profile.invoice_number_padding !== 4) ||
    (profile?.reminder_days_before != null && profile.reminder_days_before !== 1) ||
    (taxCount || 0) > 0
  );
}

type ManualState = Partial<Record<GuideItemId, boolean>>;

const GUIDE_REFRESH_EVENT = 'start-guide-refresh';

function storageKey(prefix: string, userId: string) {
  return `start-guide:${prefix}:${userId}`;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage failures
  }
}

export function notifyStartGuideRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GUIDE_REFRESH_EVENT));
}

/** Marks a getting-started item complete (e.g. after saving invoice settings). */
export function markStartGuideItemComplete(userId: string, id: GuideItemId) {
  const key = storageKey('manual', userId);
  const next = { ...loadJson<ManualState>(key, {}), [id]: true };
  saveJson(key, next);
  notifyStartGuideRefresh();
}

export { GUIDE_REFRESH_EVENT, storageKey, loadJson, saveJson };
