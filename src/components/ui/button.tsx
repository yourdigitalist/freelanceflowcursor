import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { Spinner, spinnerVariantForButton } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Purple brand CTA — one per screen (design: btn-brand) */
        default:
          "border border-transparent bg-primary text-primary-foreground hover:bg-primary-deep disabled:bg-primary/35 disabled:text-primary-foreground [&_svg]:text-current",
        /** Alias for default — same as btn-brand */
        brand:
          "border border-transparent bg-primary text-primary-foreground hover:bg-primary-deep disabled:bg-primary/35 disabled:text-primary-foreground [&_svg]:text-current",
        /** Alias for brand for teams using btn-purple naming */
        purple:
          "border border-transparent bg-primary text-primary-foreground hover:bg-primary-deep disabled:bg-primary/35 disabled:text-primary-foreground [&_svg]:text-current",
        /** Near-black action — when purple is too loud (design: btn-primary / Log time) */
        secondary: "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 [&_svg]:text-current",
        /** Alias for near-black action for teams using btn-primary naming */
        primary: "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 [&_svg]:text-current",
        /** Default outline (design: plain btn / Cancel) */
        outline:
          "border border-foreground/20 bg-card text-foreground hover:bg-muted disabled:opacity-50",
        /** Subtle filled action for low emphasis toolbars */
        subtle: "bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50",
        ghost: "text-foreground hover:bg-muted disabled:opacity-50",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 [&_svg]:text-current",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        xs: "h-8 rounded-md px-2.5 text-xs",
        default: "h-9 px-4 text-sm",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-sm",
        "icon-sm": "h-8 w-8",
        icon: "h-10 w-10",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows spinner and disables the button while true. */
  loading?: boolean;
  /** Replaces children while loading (e.g. "Saving…"). */
  loadingText?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={isDisabled}
          aria-busy={loading || undefined}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Spinner variant={spinnerVariantForButton(variant)} className="size-4" /> : null}
        {loading && loadingText != null ? loadingText : children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
