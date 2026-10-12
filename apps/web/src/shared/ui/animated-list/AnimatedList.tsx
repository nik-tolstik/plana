import { motion, useReducedMotion } from "motion/react";
import type * as React from "react";

import { cn } from "@/shared/lib/cn";

/**
 * finnn → Plana (упрощён, без сплэша загрузки): элементы списков приходят
 * fade+rise со стаггером; шаг ограничен, чтобы длинные списки не растягивали
 * появление на секунды.
 */
export const STAGGER_STEP_MS = 40;
export const STAGGER_MAX_STEPS = 8;

export function staggerDelayMs(index: number): number {
  return Math.min(index, STAGGER_MAX_STEPS) * STAGGER_STEP_MS;
}

const ITEM_HIDDEN = { opacity: 0, y: 8 };
const ITEM_VISIBLE = { opacity: 1, y: 0 };
const ITEM_TRANSITION = { duration: 0.25, ease: "easeOut" } as const;

export function AnimatedListItem({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={cn("w-full", className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn("w-full", className)}
      initial={ITEM_HIDDEN}
      animate={ITEM_VISIBLE}
      transition={{ ...ITEM_TRANSITION, delay: delayMs / 1000 }}
    >
      {children}
    </motion.div>
  );
}
