import { motion, useReducedMotion } from "motion/react";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface SegmentedOption<TValue extends string | number = string> {
  value: TValue;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedProps<TValue extends string | number = string> {
  options: SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
  disabled?: boolean;
  name?: string;
}

/**
 * finnn → Plana (упрощён): индикатор выбранного сегмента плавно переезжает
 * (motion, layout-метрики), role="radiogroup" для доступности, без иконок.
 */
export function Segmented<TValue extends string | number = string>({
  options,
  value,
  onChange,
  className,
  disabled,
  name,
}: SegmentedProps<TValue>) {
  const prefersReducedMotion = useReducedMotion();
  const groupId = useId();
  const groupName = name ?? `segmented-${groupId}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLLabelElement | null>>([]);
  const [indicator, setIndicator] = useState({ height: 0, left: 0, top: 0, width: 0 });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const firstEnabledIndex = options.findIndex((option) => !option.disabled);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabledIndex, 0);

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const selectedOption = selectedIndex >= 0 ? optionRefs.current[selectedIndex] : null;

    if (!container || !selectedOption) {
      setIndicator({ height: 0, left: 0, top: 0, width: 0 });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const optionRect = selectedOption.getBoundingClientRect();
    setIndicator({
      height: optionRect.height,
      left: optionRect.left - containerRect.left,
      top: optionRect.top - containerRect.top,
      width: optionRect.width,
    });
  }, [selectedIndex]);

  useLayoutEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      data-slot="segmented"
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-segmented p-0.5",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {options.map((option, index) => {
        const isSelected = index === activeIndex;
        return (
          <label
            key={String(option.value)}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            className={cn(
              "relative z-10 flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors select-none",
              isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              option.disabled && "pointer-events-none opacity-50",
            )}
          >
            {isSelected ? (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-md bg-segmented-indicator shadow-sm"
                initial={false}
                animate={{
                  height: indicator.height,
                  left: indicator.left,
                  top: indicator.top,
                  width: indicator.width,
                }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 40 }
                }
              />
            ) : null}
            <input
              type="radio"
              name={groupName}
              value={String(option.value)}
              checked={isSelected}
              disabled={disabled || option.disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
