// @ts-nocheck
/** Branded client comms header/footer (freelancer → client emails). */

export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((out, [key, value]) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    return out.replace(re, value);
  }, template);
}

const EMAIL_COMMS_CONFIG_PREFIX = "LANCE_EMAIL_CONFIG::";

export function parseEmailCommsConfig(raw: string | null | undefined): {
  logoLight: string;
  logoDark: string;
  logoVariant: "light" | "dark";
} {
  const fallback = { logoLight: "", logoDark: "", logoVariant: "light" as const };
  const text = (raw || "").trim();
  if (!text.startsWith(EMAIL_COMMS_CONFIG_PREFIX)) return fallback;
  try {
    const parsed = JSON.parse(text.slice(EMAIL_COMMS_CONFIG_PREFIX.length));
    const logoLight =
      typeof parsed?.logoDefault === "string"
        ? parsed.logoDefault
        : typeof parsed?.logoLight === "string"
          ? parsed.logoLight
          : "";
    const logoDark =
      typeof parsed?.logoSecondary === "string"
        ? parsed.logoSecondary
        : typeof parsed?.logoDark === "string"
          ? parsed.logoDark
          : "";
    return {
      logoLight,
      logoDark,
      logoVariant: parsed?.logoVariant === "dark" ? "dark" : "light",
    };
  } catch {
    return fallback;
  }
}

export function normalizeLogoUrl(raw: string, supabaseUrl: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = (supabaseUrl || "").replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function getDefaultClientHeader(logoUrl: string, businessName: string, primaryColor: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="padding: 18px 20px; background: ${primaryColor}; color: white;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(businessName)}" style="height: 28px; max-width: 160px; object-fit: contain;" />` : `<strong style="font-size: 18px;">${escapeHtml(businessName)}</strong>`}
  </div>
  <div style="padding: 20px;">`;
}

export function getDefaultClientFooter(primaryColor: string, businessName: string, businessEmail: string): string {
  const safeName = escapeHtml(businessName || "Your Business");
  const safeEmail = escapeHtml(businessEmail || "");
  return `</div><div style="padding: 14px 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
  Sent by <span style="color: ${primaryColor}; font-weight: 600;">${safeName}</span>${safeEmail ? ` · <span>${safeEmail}</span>` : ""}
</div></div>`;
}
