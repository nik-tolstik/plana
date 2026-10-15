import { cn } from "@/shared/lib/cn";

export interface SectionHeaderDndProps {
  over: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
}

/** Заголовок секции сайдбара: маленький каптал + действия справа; может быть drop-целью. */
export function SectionHeader({
  label,
  action,
  dnd,
}: {
  label: string;
  action?: React.ReactNode;
  dnd?: SectionHeaderDndProps;
}) {
  return (
    <div
      className={cn(
        "flex min-h-7 items-center justify-between gap-1 rounded-md pl-2 pr-1 transition-colors",
        dnd?.over && "bg-surface-selected",
      )}
      onDragOver={dnd?.onDragOver}
      onDragLeave={dnd?.onDragLeave}
      onDrop={dnd?.onDrop}
    >
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {action}
    </div>
  );
}

export function HeaderIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}
