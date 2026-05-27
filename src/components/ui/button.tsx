import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Purple brand CTA — one per screen (design: btn-brand) */
        default:
          "bg-primary text-primary-foreground hover:bg-primary-deep disabled:bg-primary/35 disabled:text-primary-foreground",
        /** Alias for default — same as btn-brand */
        brand:
          "bg-primary text-primary-foreground hover:bg-primary-deep disabled:bg-primary/35 disabled:text-primary-foreground",
        /** Alias for brand for teams using btn-purple naming */
        purple:
          "bg-primary text-primary-foreground hover:bg-primary-deep disabled:bg-primary/35 disabled:text-primary-foreground",
        /** Near-black action — when purple is too loud (design: btn-primary / Log time) */
        secondary: "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50",
        /** Alias for near-black action for teams using btn-primary naming */
        primary: "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50",
        /** Default outline (design: plain btn / Cancel) */
        outline:
          "border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50",
        ghost: "text-foreground hover:bg-muted disabled:opacity-50",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
