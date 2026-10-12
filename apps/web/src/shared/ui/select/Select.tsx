import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/cn";

type SelectProps = Omit<React.ComponentProps<"select">, "children"> & {
  children: React.ReactNode;
};

/**
 * Нативный select со стилизацией под дизайн-систему: контроль-фон, каретка,
 * фокус-ринг. Нативное меню ОС — доступность бесплатно (finnn-компонент
 * SelectDropdown/SelectSheet на floating-ui — post-MVP при необходимости).
 */
function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-md bg-control pr-8 pl-3 text-sm outline-none transition-[color,background-color,box-shadow] hover:bg-control-hover disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-control-focus/30 ring-inset",
          "aria-invalid:ring-2 aria-invalid:ring-destructive/35",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
export type { SelectProps };
