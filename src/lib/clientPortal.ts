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

export function getClientPortalUrl(portalToken: string): string {
  const base = getSiteUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/portal/${portalToken.trim()}`;
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
