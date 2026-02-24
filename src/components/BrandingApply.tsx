import { useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';

/** Converts hex #RRGGBB to HSL string "H S% L%" for CSS variables. */
function hexToHslString(hex: string): string {
  const cleaned = hex.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return '';
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  return `${hDeg} ${sPct}% ${lPct}%`;
}

const PRIMARY_VARS = [
  '--primary',
  '--accent',
  '--ring',
  '--sidebar-primary',
  '--sidebar-accent-foreground',
  '--sidebar-ring',
  '--purple-dark',
  '--chart-1',
] as const;

/** Default favicon when no branding: simple "L" SVG so Lovable never appears. */
const DEFAULT_FAVICON_DATA_URL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%236b21a8"/><text x="16" y="22" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">L</text></svg>'
  );

/**
 * Applies app branding globally: favicon (from favicon_url or icon_url) and optional primary color.
 * Removes any existing favicon links and sets a single one so Lovable/cached icons are gone.
 */
export function BrandingApply() {
  const { data: branding } = useBranding();

  useEffect(() => {
    const href = branding?.favicon_url || branding?.icon_url || DEFAULT_FAVICON_DATA_URL;
    const type = href.startsWith('data:') ? 'image/svg+xml' : (href.toLowerCase().endsWith('.ico') ? 'image/x-icon' : 'image/svg+xml');
    document.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    link.type = type;
    document.head.appendChild(link);
  }, [branding?.favicon_url, branding?.icon_url]);

  useEffect(() => {
    const root = document.documentElement;
    if (!branding?.primary_color?.trim()) {
      PRIMARY_VARS.forEach((v) => root.style.removeProperty(v));
      return;
    }
    const hsl = hexToHslString(branding.primary_color.trim());
    if (!hsl) return;
    PRIMARY_VARS.forEach((v) => root.style.setProperty(v, hsl));
  }, [branding?.primary_color]);

  return null;
}
