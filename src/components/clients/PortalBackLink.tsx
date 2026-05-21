import { Link } from "react-router-dom";
import { ArrowLeft } from "@/components/icons";
import { getClientPortalUrl } from "@/lib/clientPortal";

export function PortalBackLink({ portalToken }: { portalToken: string | null | undefined }) {
  if (!portalToken?.trim()) return null;
  return (
    <Link
      to={getClientPortalUrl(portalToken)}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to client portal
    </Link>
  );
}

export function usePortalTokenFromSearch(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("portal");
}
