/** Routes where third-party widgets (Crisp, Hotjar) should not load. */
export const PUBLIC_CLIENT_ROUTE_PREFIXES = [
  "/auth",
  "/reset-password",
  "/onboarding",
  "/review/",
  "/contract/",
  "/portal/",
  "/proposal/",
] as const;

export const PUBLIC_CLIENT_ROUTE_EXACT = ["/terms", "/privacy"] as const;

export function isPublicClientRoute(pathname: string): boolean {
  if ((PUBLIC_CLIENT_ROUTE_EXACT as readonly string[]).includes(pathname)) return true;
  return PUBLIC_CLIENT_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
