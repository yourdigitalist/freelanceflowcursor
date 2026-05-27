import * as React from "react";

import { cn } from "@/lib/utils";

export function ViewToggle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      className={cn("inline-flex items-center rounded-lg border border-border bg-card p-0.5", className)}
      {...props}
    />
  );
}

export interface ViewToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const ViewToggleButton = React.forwardRef<HTMLButtonElement, ViewToggleButtonProps>(
  ({ className, active, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active && "bg-foreground text-background hover:text-background",
        className,
      )}
      {...props}
    />
  ),
);
ViewToggleButton.displayName = "ViewToggleButton";
