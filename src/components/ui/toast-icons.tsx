import { cn } from "@/lib/utils";

const iconShell = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full";

type ToastIconProps = { className?: string };

export function ToastSuccessIcon({ className }: ToastIconProps) {
  return (
    <span className={cn(iconShell, "bg-emerald-500", className)} aria-hidden>
      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 6.25 4.75 8.5 9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ToastWarningIcon({ className }: ToastIconProps) {
  return (
    <span className={cn(iconShell, "bg-amber-500", className)} aria-hidden>
      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M6 3.25v3.25M6 8.75h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ToastErrorIcon({ className }: ToastIconProps) {
  return (
    <span className={cn(iconShell, "bg-red-500", className)} aria-hidden>
      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
        <path
          d="M3.25 3.25 8.75 8.75M8.75 3.25 3.25 8.75"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
