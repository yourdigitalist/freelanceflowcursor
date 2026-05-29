import { cn } from "@/lib/utils";

const iconBase = "h-5 w-5 shrink-0";

type ToastIconProps = { className?: string };

export function ToastSuccessIcon({ className }: ToastIconProps) {
  return (
    <svg className={cn(iconBase, "text-emerald-500", className)} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.25 10.25 8.5 12.5 13.75 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ToastWarningIcon({ className }: ToastIconProps) {
  return (
    <svg className={cn(iconBase, "text-amber-500", className)} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.25v4.5M10 13.75h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function ToastErrorIcon({ className }: ToastIconProps) {
  return (
    <svg className={cn(iconBase, "text-red-500", className)} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.25 7.25 12.75 12.75M12.75 7.25 7.25 12.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
