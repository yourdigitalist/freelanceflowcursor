/**
 * Base URL for the app, used in emails and shared links (e.g. verification, review link).
 * Set VITE_SITE_URL in production so links point to the real site, not localhost.
 */
export function getSiteUrl(): string {
  const env = import.meta.env.VITE_SITE_URL;
  if (env && typeof env === 'string' && env.trim()) return env.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
