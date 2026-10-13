import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  flip,
  offset as floatingOffset,
  type Placement,
  type ReferenceType,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

type PopoverTriggerRenderProps = Omit<React.HTMLAttributes<HTMLElement>, "ref"> & {
  "aria-expanded": boolean;
  "data-state": "open" | "closed";
  ref: React.RefCallback<HTMLElement>;
};

interface PopoverRenderProps {
  close: () => void;
  open: boolean;
}

interface PopoverBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children: React.ReactNode | ((props: PopoverRenderProps) => React.ReactNode);
  /** Открытие по клику на триггер; "manual" — только извне (контекстное меню). */
  interaction?: "click" | "manual";
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  /** Смещение от якоря в px. */
  offset?: number;
  placement?: Placement;
  /** Внешний якорь вместо триггера (например, точка курсора для ПКМ). */
  reference?: ReferenceType | null;
  role?: "dialog" | "menu";
  trigger?: (props: PopoverTriggerRenderProps) => React.ReactNode;
}

type PopoverProps =
  | (PopoverBaseProps & {
      reference?: undefined;
      trigger: (props: PopoverTriggerRenderProps) => React.ReactNode;
    })
  | (PopoverBaseProps & {
      reference: ReferenceType | null;
      trigger?: (props: PopoverTriggerRenderProps) => React.ReactNode;
    });

function getPlacementParts(placement: Placement) {
  const [side = "bottom", align = "center"] = placement.split("-");
  return { side, align };
}

function getClosedTransform(side: string) {
  switch (side) {
    case "top":
      return "translateY(0.25rem) scale(0.96)";
    case "right":
      return "translateX(-0.25rem) scale(0.96)";
    case "left":
      return "translateX(0.25rem) scale(0.96)";
    default:
      return "translateY(-0.25rem) scale(0.96)";
  }
}

function getTransformOrigin(side: string, align: string) {
  const crossAxis = align === "start" ? "left" : align === "end" ? "right" : "center";

  switch (side) {
    case "top":
      return `${crossAxis} bottom`;
    case "right":
      return "left center";
    case "left":
      return "right center";
    default:
      return `${crossAxis} top`;
  }
}

/**
 * finnn → Plana (упрощён): без FloatingTree и overlay-portal-root, триггер —
 * render-prop (props от floating-ui), появление — CSS-переход floating-ui
 * (fade + scale от стороны якоря). Ссылочная ширина триггера доступна как
 * var(--popover-trigger-width) внутри контента.
 */
export function Popover({
  children,
  className,
  interaction = "click",
  onOpenChange,
  open,
  offset = 4,
  placement = "bottom",
  reference,
  role = "dialog",
  style,
  trigger,
  ...contentProps
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const {
    context,
    floatingStyles,
    refs,
    placement: resolvedPlacement,
  } = useFloating({
    onOpenChange: setOpen,
    open: isOpen,
    placement,
    strategy: "fixed",
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [
      floatingOffset(offset),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, availableWidth, elements, rects }) {
          elements.floating.style.setProperty(
            "--popover-trigger-width",
            `${rects.reference.width}px`,
          );
          elements.floating.style.setProperty(
            "--popover-content-available-height",
            `${availableHeight}px`,
          );
          elements.floating.style.setProperty(
            "--popover-content-available-width",
            `${availableWidth}px`,
          );
        },
      }),
    ],
  });

  React.useLayoutEffect(() => {
    if (reference !== undefined) {
      refs.setReference(reference);
    }
  }, [reference, refs]);

  const click = useClick(context, { enabled: interaction === "click" });
  const dismiss = useDismiss(context);
  const roleInteraction = useRole(context, { role });
  const { getFloatingProps, getReferenceProps } = useInteractions([
    click,
    dismiss,
    roleInteraction,
  ]);
  const { side, align } = getPlacementParts(resolvedPlacement);
  const closedTransform = getClosedTransform(side);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: { close: 120, open: 180 },
    initial: {
      opacity: 0,
      transform: closedTransform,
    },
    open: {
      opacity: 1,
      transform: "translate(0, 0) scale(1)",
    },
    close: {
      opacity: 0,
      transform: closedTransform,
    },
    common: {
      transformOrigin: getTransformOrigin(side, align),
    },
  });

  const close = React.useCallback(() => setOpen(false), [setOpen]);

  const triggerProps: PopoverTriggerRenderProps = {
    ...getReferenceProps(),
    "aria-expanded": isOpen,
    "data-state": isOpen ? "open" : "closed",
    ref: refs.setReference as React.RefCallback<HTMLElement>,
  };

  return (
    <>
      {trigger?.(triggerProps)}
      {isMounted && (
        <FloatingPortal preserveTabOrder={false}>
          <FloatingFocusManager context={context} initialFocus={-1} modal={false}>
            <div
              {...getFloatingProps(contentProps)}
              ref={refs.setFloating}
              data-align={align}
              data-side={side}
              data-slot="popover-content"
              data-state={isOpen ? "open" : "closed"}
              className={cn(
                "pointer-events-auto z-50 rounded-lg border border-border bg-popover text-card-foreground shadow-lg outline-hidden",
                className,
              )}
              style={{
                ...floatingStyles,
                ...transitionStyles,
                ...style,
              }}
            >
              {typeof children === "function" ? children({ close, open: isOpen }) : children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

export type { PopoverProps, PopoverRenderProps, PopoverTriggerRenderProps };
