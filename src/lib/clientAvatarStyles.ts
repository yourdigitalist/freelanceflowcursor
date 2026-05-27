import { DEFAULT_CLIENT_AVATAR_COLOR } from '@/lib/clientAvatarColors';

/** Shared shell: white ring + soft lift (matches client list design). */
export const CLIENT_AVATAR_SHELL =
  'rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]';

function normalizeHex(hex: string): string | null {
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned}`;
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    return `#${cleaned
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const cleaned = normalized.slice(1);
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export type ClientAvatarAppearance = {
  backgroundColor: string;
  color: string;
};

/** Pastel background + saturated initial from the client's chosen avatar color. */
export function getClientAvatarAppearance(baseColor: string): ClientAvatarAppearance {
  const rgb = hexToRgb(baseColor) ?? hexToRgb(DEFAULT_CLIENT_AVATAR_COLOR);
  if (!rgb) {
    return { backgroundColor: '#f3f0ff', color: '#5b21b6' };
  }

  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  if (s < 12) {
    return {
      backgroundColor: 'hsl(220, 12%, 94%)',
      color: 'hsl(220, 8%, 42%)',
    };
  }

  const bgSaturation = Math.min(52, Math.max(28, Math.round(s * 0.5)));
  const fgSaturation = Math.min(72, Math.max(48, Math.round(s * 0.88)));
  const fgLightness = Math.min(42, Math.max(32, 38));

  return {
    backgroundColor: `hsl(${h}, ${bgSaturation}%, 94%)`,
    color: `hsl(${h}, ${fgSaturation}%, ${fgLightness}%)`,
  };
}
