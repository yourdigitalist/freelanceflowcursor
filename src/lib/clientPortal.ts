export type PortalTimeVisibility = "billable" | "non_billable" | "both";

export type ClientPortalSections = {
  details: boolean;
  invoices: boolean;
  proposals: boolean;
  contracts: boolean;
  approvals: boolean;
  time: boolean;
  time_visibility: PortalTimeVisibility;
};

export const DEFAULT_PORTAL_SECTIONS: ClientPortalSections = {
  details: true,
  invoices: true,
  proposals: true,
  contracts: true,
  approvals: true,
  time: false,
  time_visibility: "both",
};

export function parsePortalSections(raw: unknown): ClientPortalSections {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PORTAL_SECTIONS };
  const o = raw as Record<string, unknown>;
  const timeVis = o.time_visibility;
  return {
    details: o.details !== false,
    invoices: o.invoices !== false,
    proposals: o.proposals !== false,
    contracts: o.contracts !== false,
    approvals: o.approvals !== false,
    time: o.time === true,
    time_visibility:
      timeVis === "billable" || timeVis === "non_billable" ? timeVis : "both",
  };
}

import { getSiteUrl } from "@/lib/site-url";

/** In-app route for React Router (always relative). */
export function getClientPortalPath(portalToken: string): string {
  return `/portal/${encodeURIComponent(portalToken.trim())}`;
}

export function getClientPortalUrl(portalToken: string): string {
  const base = getSiteUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${getClientPortalPath(portalToken)}`;
}

export function portalQueryParam(portalToken: string | null | undefined): string {
  if (!portalToken) return "";
  return `portal=${encodeURIComponent(portalToken)}`;
}

export function appendPortalParam(url: string, portalToken: string | null | undefined): string {
  if (!portalToken) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}portal=${encodeURIComponent(portalToken)}`;
}

/**
 * Currency for displaying money: per-client first, then your profile default (Settings → Locale).
 */
export function resolveMoneyCurrency(
  clientCurrency?: string | null,
  profileCurrency?: string | null,
): string {
  const client = String(clientCurrency || "").trim().toUpperCase();
  const profile = String(profileCurrency || "").trim().toUpperCase();
  if (client) return client;
  if (profile) return profile;
  return "USD";
}

/** Format money for client portal and client detail tabs. */
export function formatPortalMoney(
  amount: number | null | undefined,
  clientCurrency?: string | null,
  profileCurrency?: string | null,
): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  const code = resolveMoneyCurrency(clientCurrency, profileCurrency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(amount));
  }
}
