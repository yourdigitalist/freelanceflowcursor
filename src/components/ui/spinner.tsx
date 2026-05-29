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
