import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrintButtonProps extends Omit<ButtonProps, 'children'> {
  label?: string;
  showLabel?: boolean;
  iconSize?: number;
}

/**
 * Standardized print button component used across the application.
 * Ensures consistent styling and layout for all print actions.
 */
export const PrintButton = React.forwardRef<HTMLButtonElement, PrintButtonProps>(
  ({ label = "Imprimir", showLabel = true, iconSize = 16, variant = "outline", size = "sm", className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        {...props}
      >
        <Printer style={{ width: iconSize, height: iconSize }} />
        {showLabel && <span>{label}</span>}
      </Button>
    );
  }
);
PrintButton.displayName = "PrintButton";

/**
 * Icon-only print button for compact spaces (tables, cards)
 */
export const PrintIconButton = React.forwardRef<HTMLButtonElement, Omit<PrintButtonProps, 'label' | 'showLabel'>>(
  ({ iconSize = 16, variant = "ghost", size = "icon", className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("h-8 w-8", className)}
        title="Imprimir"
        {...props}
      >
        <Printer style={{ width: iconSize, height: iconSize }} />
      </Button>
    );
  }
);
PrintIconButton.displayName = "PrintIconButton";
