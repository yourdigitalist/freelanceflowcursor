/** Google Analytics 4 helpers (browser). Base gtag is in index.html. */

export const GA_MEASUREMENT_ID = 'G-F987NCEKDC';

const STORAGE_PREFIX = 'lance_ga_';

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGaEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

export function trackGaOnce(
  storageKey: string,
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  const key = `${STORAGE_PREFIX}${storageKey}`;
  try {
    if (sessionStorage.getItem(key)) return;
    trackGaEvent(eventName, params);
    sessionStorage.setItem(key, '1');
  } catch {
    trackGaEvent(eventName, params);
  }
}

export function trackGaViewLanding(): void {
  trackGaOnce('view_landing', 'view_landing', { page_type: 'landing' });
}

export function trackGaViewSignup(source?: string): void {
  trackGaOnce('view_signup', 'view_signup', {
    page_type: 'signup',
    ...(source ? { source } : {}),
  });
}

export function trackGaCtaClick(location: string, ctaText?: string, linkUrl?: string): void {
  trackGaEvent('cta_click', {
    cta_location: location,
    ...(ctaText ? { cta_text: ctaText.slice(0, 100) } : {}),
    ...(linkUrl ? { link_url: linkUrl } : {}),
  });
}

export function trackGaSignUpFormStart(): void {
  trackGaOnce('signup_form_start', 'form_start', {
    form_name: 'signup',
    form_destination: '/auth',
  });
}

export function trackGaSignUp(method = 'email'): void {
  trackGaEvent('sign_up', { method });
}
