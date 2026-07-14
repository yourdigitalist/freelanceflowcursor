import { emptyDisplayText } from "@/lib/emptyDisplay";

/** Human-readable status label (e.g. pending_signatures → Pending signatures). */
export function formatStatusLabel(status?: string | null): string {
  if (!status?.trim()) return emptyDisplayText({ field: "status" });

  const normalized = status.trim().toLowerCase();

  const overrides: Record<string, string> = {
    pending_signatures: "Pending signatures",
    reminder_sent: "Reminder sent",
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
    case "reminder_sent":
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

/** Pill + dot styles for data tables (matches invoice list mock). */
export function getTableStatusBadgeStyles(status?: string | null): { badge: string; dot: string } {
  const key = (status || "").trim().toLowerCase();

  switch (key) {
    case "paid":
    case "active":
    case "accepted":
    case "approved":
    case "signed":
    case "won":
    case "completed":
      return {
        badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };

    case "sent":
    case "pending":
    case "pending_signatures":
    case "read":
    case "invoiced":
    case "billed":
      return {
        badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
        dot: "bg-blue-500",
      };

    case "reminder_sent":
      return {
        badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
        dot: "bg-violet-500",
      };

    case "overdue":
    case "proposal_sent":
    case "negotiation":
      return {
        badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
        dot: "bg-orange-500",
      };

    case "lead_qualified":
    case "lead_contacted":
    case "onboarding":
      return {
        badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
        dot: "bg-blue-500",
      };

    case "draft":
    case "lead_new":
      return {
        badge: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
        dot: "bg-neutral-400",
      };

    case "cancelled":
    case "rejected":
    case "closed_lost":
    case "inactive":
    case "paused":
      return {
        badge: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        dot: "bg-red-500",
      };

    case "unbilled":
    case "billable":
      return {
        badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
        dot: "bg-amber-500",
      };

    default:
      return {
        badge: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground/60",
      };
  }
}
