import type * as React from "react";

import { cn } from "@/shared/lib/cn";

export type LabelProps = {
  required?: boolean;
} & React.LabelHTMLAttributes<HTMLLabelElement>;

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex select-none items-center text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required ? <span className="ml-1 text-xl leading-none text-destructive">*</span> : null}
    </label>
  );
}

export { Label };
