import type * as React from "react";

import { cn } from "@/shared/lib/cn";

type InputProps = Omit<React.ComponentProps<"input">, "prefix"> & {
  prefix?: React.ReactNode;
  /** Контент справа (кнопки настроек); элементам для кликов нужен pointer-events-auto. */
  suffix?: React.ReactNode;
};

function Input({ className, prefix, suffix, type, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      {prefix ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 z-10 inline-flex w-fit select-none items-center text-xs font-medium text-muted-foreground"
        >
          {prefix}
        </span>
      ) : null}
      {suffix ? (
        <span className="absolute inset-y-0 right-1 z-10 inline-flex items-center">{suffix}</span>
      ) : null}
      <input
        type={type}
        data-slot="input"
        className={cn(
          "h-9 w-full min-w-0 rounded-md bg-control px-3 py-1 text-sm outline-none transition-[color,background-color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-control-placeholder hover:bg-control-hover disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:bg-control focus-visible:ring-2 focus-visible:ring-control-focus/30 ring-inset",
          "aria-invalid:ring-2 aria-invalid:ring-destructive/35 dark:aria-invalid:ring-destructive/45",
          prefix && "pl-10",
          suffix && "pr-24",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export { Input };
export type { InputProps };
