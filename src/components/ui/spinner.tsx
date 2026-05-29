import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  /** Use on dark / brand buttons (white arc). */
  variant?: "default" | "on-primary";
};

/** Thin partial-circle loader — matches Lance design system. */
export function Spinner({ className, variant = "default" }: SpinnerProps) {
  return (
    <svg
      className={cn(
        "size-4 shrink-0 animate-spin",
        variant === "on-primary" ? "text-primary-foreground" : "text-current",
        className,
      )}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32 56"
      />
    </svg>
  );
}

type LoadingInlineProps = {
  label: string;
  className?: string;
};

/** Muted inline loading row (e.g. “Loading invoices…”). */
export function LoadingInline({ label, className }: LoadingInlineProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Spinner className="text-muted-foreground" />
      {label}
    </span>
  );
}

const ON_PRIMARY_VARIANTS = new Set(["default", "brand", "purple", "secondary", "primary", "destructive"]);

export function spinnerVariantForButton(
  variant?: string | null,
): SpinnerProps["variant"] {
  return variant && ON_PRIMARY_VARIANTS.has(variant) ? "on-primary" : "default";
}
