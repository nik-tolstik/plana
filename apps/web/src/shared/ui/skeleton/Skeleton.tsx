import type * as React from "react";

import { cn } from "@/shared/lib/cn";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface-subtle", className)}
      {...props}
    />
  );
}

export { Skeleton };
