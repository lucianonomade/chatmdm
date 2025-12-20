import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-primary/20 shadow-md shadow-primary/20 hover:brightness-90 hover:shadow-lg hover:shadow-primary/30 active:brightness-75",
        destructive: "bg-destructive text-destructive-foreground border border-destructive/20 shadow-md shadow-destructive/20 hover:brightness-90 hover:shadow-lg hover:shadow-destructive/30 active:brightness-75",
        outline: "border-2 border-primary/30 bg-background text-foreground shadow-sm hover:bg-hover/10 hover:border-hover/50 hover:shadow-md active:bg-hover/20",
        secondary: "bg-secondary text-secondary-foreground border border-secondary-foreground/10 shadow-sm hover:brightness-95 hover:shadow-md active:brightness-90",
        ghost: "hover:bg-accent/20 hover:text-accent-foreground active:bg-accent/30",
        link: "text-primary underline-offset-4 hover:underline hover:brightness-90",
        success: "bg-success text-success-foreground border border-success/20 shadow-md shadow-success/20 hover:brightness-90 hover:shadow-lg hover:shadow-success/30 active:brightness-75",
        warning: "bg-warning text-warning-foreground border border-warning/20 shadow-md shadow-warning/20 hover:brightness-90 hover:shadow-lg hover:shadow-warning/30 active:brightness-75",
        info: "bg-info text-info-foreground border border-info/20 shadow-md shadow-info/20 hover:brightness-90 hover:shadow-lg hover:shadow-info/30 active:brightness-75",
      },
      size: {
        default: "h-9 sm:h-10 px-3 sm:px-4 py-2 text-sm",
        sm: "h-8 sm:h-9 rounded-md px-2.5 sm:px-3 text-xs sm:text-sm",
        lg: "h-10 sm:h-11 rounded-md px-6 sm:px-8 text-sm sm:text-base",
        icon: "h-9 w-9 sm:h-10 sm:w-10",
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
