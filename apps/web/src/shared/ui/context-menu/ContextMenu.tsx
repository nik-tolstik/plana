import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Popover } from "@/shared/ui/popover";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Действие пункта; отсутствует, если есть submenu. */
  onSelect?: () => void;
  /** Вложенный уровень: клик раскрывает пункты вместо действия. */
  submenu?: ContextMenuItem[];
  /** Текущее значение справа от пункта (например «Сегодня»). */
  hint?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  /** render-prop: прокидывает onContextMenu на целевой элемент. */
  children: (props: { onContextMenu: React.MouseEventHandler }) => React.ReactNode;
}

/**
 * Контекстное меню по правому клику: якорь — точка курсора (виртуальный
 * элемент floating-ui), flip/shift не дают выйти за экран. Выбор пункта
 * или клик мимо закрывают меню. Пункт с submenu раскрывается «вглубь»
 * (кнопка «Назад» в шапке уровня) — работает и мышью, и на тач-экранах.
 */
export function ContextMenu({ items, children }: ContextMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [point, setPoint] = React.useState<{ x: number; y: number } | null>(null);
  const [stack, setStack] = React.useState<ContextMenuItem[]>([]);

  const reference = React.useMemo(
    () =>
      point
        ? {
            getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0),
          }
        : null,
    [point],
  );

  const handleContextMenu = React.useCallback<React.MouseEventHandler>((event) => {
    event.preventDefault();
    setPoint({ x: event.clientX, y: event.clientY });
    setStack([]);
    setOpen(true);
  }, []);

  const parent = stack.at(-1) ?? null;
  const level = parent?.submenu ?? items;

  return (
    <>
      {children({ onContextMenu: handleContextMenu })}
      <Popover
        open={open}
        onOpenChange={setOpen}
        reference={reference}
        interaction="manual"
        role="menu"
        placement="bottom-start"
        className="min-w-44 p-1"
      >
        {parent ? (
          <div className="mb-1 flex items-center gap-1 border-b border-border pb-1">
            <button
              type="button"
              role="menuitem"
              aria-label="Назад"
              onClick={() => setStack((current) => current.slice(0, -1))}
              className="cursor-pointer rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-option-hover hover:text-foreground"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span className="min-w-0 truncate text-sm font-medium">{parent.label}</span>
          </div>
        ) : null}
        {level.map((item) => {
          const hasSubmenu = item.submenu !== undefined && item.submenu.length > 0;
          return (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              aria-haspopup={hasSubmenu ? "menu" : undefined}
              disabled={item.disabled}
              onClick={() => {
                if (hasSubmenu) {
                  setStack((current) => [...current, item]);
                  return;
                }
                setOpen(false);
                item.onSelect?.();
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-option-hover focus-visible:bg-option-hover disabled:cursor-not-allowed disabled:opacity-50",
                item.danger && "text-destructive hover:bg-destructive/10",
              )}
            >
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.hint ? (
                <span className="max-w-24 shrink-0 truncate text-xs text-muted-foreground">
                  {item.hint}
                </span>
              ) : null}
              {hasSubmenu ? (
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              ) : null}
            </button>
          );
        })}
      </Popover>
    </>
  );
}
