import type * as React from "react";

import { cn } from "@/shared/lib/cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-16 w-full rounded-md bg-control px-3 py-2 text-sm outline-none transition-[color,background-color,box-shadow] placeholder:text-control-placeholder hover:bg-control-hover disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:bg-control focus-visible:ring-2 focus-visible:ring-control-focus/30 ring-inset",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/35 dark:aria-invalid:ring-destructive/45",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
