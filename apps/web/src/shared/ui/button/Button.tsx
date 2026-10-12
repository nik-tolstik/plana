import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/cn";

/** finnn → Plana: без radix Slot (asChild не нужен), варианты те же. */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-1 focus-visible:ring-ring/50 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-95",
        danger:
          "bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-700/20 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60 dark:focus-visible:ring-red-400/30",
        secondary: "bg-surface-subtle text-secondary-foreground hover:bg-surface-hover",
        field:
          "bg-control text-foreground shadow-xs hover:bg-control-hover data-[state=open]:bg-control-hover focus-visible:ring-2 focus-visible:ring-control-focus/30",
        ghost: "text-foreground hover:bg-transparent hover:text-foreground/80",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
