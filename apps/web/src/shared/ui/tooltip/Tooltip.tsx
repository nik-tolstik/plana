import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

/**
 * CSS-only подсказка при наведении: без портала и задержки на JS,
 * показывается через group-hover с задержкой 300мс. Для контролов,
 * у которых видимой подписи нет (иконки-кнопки).
 */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  /** Класс чипа подсказки — позиционирование/ширина по месту использования. */
  className?: string;
}) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background opacity-0 transition-opacity duration-100 delay-300 group-hover/tooltip:opacity-100",
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}
