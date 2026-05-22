import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "@/components/icons";
import { getClientPortalPath } from "@/lib/clientPortal";

type PortalBackLinkProps = {
  portalToken: string | null | undefined;
  label?: string;
  className?: string;
};

export function PortalBackLink({
  portalToken,
  label = "Back to client area",
  className,
}: PortalBackLinkProps) {
  const trimmed = portalToken?.trim();
  if (!trimmed) return null;
  return (
    <Link
      to={getClientPortalPath(trimmed)}
      className={
        className ??
        "relative z-30 mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      }
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function usePortalTokenFromSearch(): string | null {
  const [searchParams] = useSearchParams();
  return searchParams.get("portal");
}
