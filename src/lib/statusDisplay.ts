/** Human-readable status label (e.g. pending_signatures → Pending signatures). */
export function formatStatusLabel(status?: string | null): string {
  if (!status?.trim()) return "—";

  const normalized = status.trim().toLowerCase();

  const overrides: Record<string, string> = {
    pending_signatures: "Pending signatures",
  };
  if (overrides[normalized]) return overrides[normalized];

  return status
    .trim()
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Tailwind classes for outline status badges (portal + app lists). */
export function getStatusBadgeClass(status?: string | null): string {
  const key = (status || "").trim().toLowerCase();

  switch (key) {
    case "active":
    case "accepted":
    case "approved":
    case "paid":
    case "signed":
    case "won":
    case "completed":
      return "bg-success/10 text-success border-success/20";

    case "sent":
    case "pending":
    case "pending_signatures":
    case "draft":
    case "proposal_sent":
    case "negotiation":
    case "lead_new":
    case "lead_contacted":
    case "lead_qualified":
    case "onboarding":
      return "bg-warning/10 text-warning border-warning/20";

    case "read":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "overdue":
    case "cancelled":
    case "rejected":
    case "closed_lost":
    case "inactive":
    case "paused":
      return "bg-destructive/10 text-destructive border-destructive/20";

    default:
      return "bg-muted text-muted-foreground border-muted";
  }
}
