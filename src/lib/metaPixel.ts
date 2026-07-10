/** Meta Pixel standard event helpers (browser). Base pixel is in index.html. */

export const META_PIXEL_ID = '1377760630866019';
export const META_CURRENCY = 'USD';

export const META_PLAN_VALUES: Record<string, number> = {
  pro_monthly: 29,
  pro_annual: 290,
};

const STORAGE_PREFIX = 'lance_meta_';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function getMetaPlanValue(planId: string): number {
  return META_PLAN_VALUES[planId] ?? 29;
}

export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventId?: string },
): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;

  if (options?.eventId) {
    window.fbq('track', eventName, params ?? {}, { eventID: options.eventId });
    return;
  }

  window.fbq('track', eventName, params);
}

export function trackMetaOnce(
  storageKey: string,
  eventName: string,
  params?: Record<string, unknown>,
): void {
  const key = `${STORAGE_PREFIX}${storageKey}`;
  try {
    if (sessionStorage.getItem(key)) return;
    trackMetaEvent(eventName, params);
    sessionStorage.setItem(key, '1');
  } catch {
    trackMetaEvent(eventName, params);
  }
}

export function trackMetaViewContent(contentName: string): void {
  trackMetaEvent('ViewContent', { content_name: contentName });
}

export function trackMetaLead(): void {
  trackMetaOnce('lead', 'Lead');
}

export function trackMetaCompleteRegistration(): void {
  trackMetaOnce('complete_registration', 'CompleteRegistration');
}

export function trackMetaStartTrial(planId: string): void {
  const value = getMetaPlanValue(planId);
  trackMetaEvent('StartTrial', {
    value: '0.00',
    currency: META_CURRENCY,
    predicted_ltv: String(value),
    content_name: planId,
  });
}

export function trackMetaInitiateCheckout(planId: string): void {
  trackMetaEvent('InitiateCheckout', {
    value: getMetaPlanValue(planId),
    currency: META_CURRENCY,
    content_name: planId,
  });
}

export function trackMetaSubscribe(planId: string, storageKey?: string): void {
  const value = getMetaPlanValue(planId);
  const params = {
    value: String(value),
    currency: META_CURRENCY,
    predicted_ltv: String(value),
    content_name: planId,
  };
  if (storageKey) {
    trackMetaOnce(storageKey, 'Subscribe', params);
    return;
  }
  trackMetaEvent('Subscribe', params);
}

export function trackMetaPurchase(planId: string, storageKey?: string): void {
  const value = getMetaPlanValue(planId);
  const params = {
    value: value,
    currency: META_CURRENCY,
    content_name: planId,
  };
  if (storageKey) {
    trackMetaOnce(storageKey, 'Purchase', params);
    return;
  }
  trackMetaEvent('Purchase', params);
}
