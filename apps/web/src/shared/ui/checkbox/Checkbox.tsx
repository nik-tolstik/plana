import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { CheckIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

type CheckboxSize = "sm" | "md" | "lg";

type CheckboxProps = Omit<HTMLMotionProps<"button">, "onChange" | "type" | "value"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: CheckboxSize;
};

const checkboxSizeClasses: Record<CheckboxSize, { root: string; icon: string }> = {
  sm: { root: "size-3.5 rounded-md", icon: "size-3" },
  md: { root: "size-4.5 rounded-md", icon: "size-3" },
  lg: { root: "size-5 rounded-md", icon: "size-3.5" },
};

/** finnn → Plana: галочка приходит spring-анимацией (motion) вместо мгновенного появления. */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    className,
    checked,
    defaultChecked = false,
    disabled,
    onCheckedChange,
    onClick,
    size = "md",
    ...props
  },
  ref,
) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const currentChecked = isControlled ? checked : internalChecked;
  const sizeClasses = checkboxSizeClasses[size];
  const prefersReducedMotion = useReducedMotion();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented || disabled) {
      return;
    }

    const nextChecked = !currentChecked;

    if (!isControlled) {
      setInternalChecked(nextChecked);
    }

    onCheckedChange?.(nextChecked);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={currentChecked}
      disabled={disabled}
      data-state={currentChecked ? "checked" : "unchecked"}
      data-size={size}
      whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.85 }}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center justify-center shadow-xs transition-[color,background-color,box-shadow] outline-none",
        "focus-visible:ring-2 focus-visible:ring-control-focus/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        currentChecked
          ? "bg-primary text-primary-foreground"
          : "bg-control text-transparent hover:bg-control-hover",
        sizeClasses.root,
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      <AnimatePresence initial={false}>
        {currentChecked ? (
          <motion.span
            key="check"
            className="flex items-center justify-center"
            initial={prefersReducedMotion ? false : { scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 700, damping: 30 }}
          >
            <CheckIcon className={sizeClasses.icon} strokeWidth={4} />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
});

export type { CheckboxProps, CheckboxSize };
export { Checkbox };
