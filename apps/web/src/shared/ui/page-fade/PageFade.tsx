import { motion, useReducedMotion } from "motion/react";
import type * as React from "react";

import { cn } from "@/shared/lib/cn";

/** Появление страницы: fade + подъём, единый ритм с элементами списков. */
export function PageFade({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("flex flex-col gap-4", className)}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
