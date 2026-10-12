import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { XIcon } from "lucide-react";
import * as React from "react";

import { useIsMobile } from "@/shared/lib/use-is-mobile";
import { cn } from "@/shared/lib/cn";

interface DialogContextValue {
  descriptionId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  titleId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Компоненты Dialog используются только внутри Dialog");
  }
  return context;
}

/**
 * finnn → Plana (упрощён): без вложенных оверлеев и actions-меню.
 * Desktop — по центру, мобильный — снизу листом; анимация scale+fade
 * (закрытие быстрее открытия), фон затемняется с блюром.
 */
function Dialog({
  children,
  defaultOpen = false,
  onOpenChange,
  open,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;
  const titleId = React.useId();
  const descriptionId = React.useId();

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const contextValue = React.useMemo(
    () => ({ descriptionId, onOpenChange: setOpen, open: isOpen, titleId }),
    [descriptionId, isOpen, setOpen, titleId],
  );

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
}

function DialogWindow({
  className,
  children,
  showCloseButton = true,
  dismissOnEscapeKey = true,
  dismissOnOutsidePress = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean;
  dismissOnEscapeKey?: boolean;
  dismissOnOutsidePress?: boolean;
}) {
  const { descriptionId, onOpenChange, open, titleId } = useDialogContext();
  const isMobile = useIsMobile();

  const { context, refs } = useFloating({ open, onOpenChange });
  const dismiss = useDismiss(context, {
    escapeKey: dismissOnEscapeKey,
    outsidePress: dismissOnOutsidePress,
  });
  const role = useRole(context, { role: "dialog" });
  const { getFloatingProps } = useInteractions([dismiss, role]);
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: { close: 120, open: 180 },
    initial: { opacity: 0, transform: "scale(0.96)" },
    open: { opacity: 1, transform: "scale(1)" },
    close: { opacity: 0, transform: "scale(0.96)" },
    common: { transformOrigin: isMobile ? "bottom center" : "center" },
  });

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        data-slot="dialog-overlay"
        data-state={open ? "open" : "closed"}
        className="fixed inset-0 z-50 grid place-items-center bg-black/18 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 dark:bg-black/42"
      >
        <FloatingFocusManager context={context} initialFocus={refs.floating} modal returnFocus>
          <div
            {...getFloatingProps(props)}
            ref={refs.setFloating}
            data-slot="dialog-content"
            data-state={open ? "open" : "closed"}
            role="dialog"
            tabIndex={-1}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className={cn(
              "fixed z-50 m-0 flex min-h-0 max-w-dvw flex-col gap-6 bg-dialog px-0 py-6 shadow-lg outline-none",
              "max-h-[calc(100dvh-4rem)] w-dvw rounded-t-lg",
              "sm:max-h-dvh sm:w-125 sm:rounded-lg",
              className,
            )}
            style={transitionStyles}
          >
            {children}
            {showCloseButton ? (
              <button
                type="button"
                data-slot="dialog-close"
                aria-label="Закрыть"
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 cursor-pointer rounded-full p-1 transition-all hover:bg-control-hover active:bg-control-hover focus:ring-1 focus:ring-control-focus/20"
              >
                <XIcon className="size-5" />
              </button>
            ) : null}
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}

function DialogContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex-1 overflow-y-auto px-6", className)} {...props} />;
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 px-6 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end [&>button:only-child]:w-full",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, id, ...props }: React.ComponentPropsWithoutRef<"h2">) {
  const { titleId } = useDialogContext();
  return (
    <h2
      id={id ?? titleId}
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, id, ...props }: React.ComponentProps<"p">) {
  const { descriptionId } = useDialogContext();
  return (
    <p
      id={id ?? descriptionId}
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogWindow,
};
