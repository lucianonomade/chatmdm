import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogHeaderWithActionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  action?: React.ReactNode;
}

/**
 * A reusable dialog header component that handles responsive layout
 * for title and action button (e.g., Print button).
 * 
 * On mobile: title and action stack vertically
 * On desktop: title and action are side by side
 * 
 * Always includes proper padding to avoid overlapping with the close button.
 */
export function DialogHeaderWithAction({
  title,
  action,
  className,
  ...props
}: DialogHeaderWithActionProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-12",
        className
      )}
      {...props}
    >
      <h2 className="text-lg font-semibold leading-none tracking-tight">
        {title}
      </h2>
      {action && (
        <div className="self-start sm:self-auto shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
