import { Link, useLocation } from "react-router";
import { InboxIcon, XIcon } from "lucide-react";
import type { ListDto, PatchListDto } from "@plana/shared";
import { useTrashList, useUpdateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { EntityMarker, EntityStylePopover } from "@/shared/ui";

export interface ListRowDndProps {
  dragging: boolean;
  over: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onDragEnd: () => void;
}

interface ListRowProps {
  list: ListDto;
  onError: (message: string) => void;
  /** Перетаскивание корневых проектов: дроп на другой проект создаёт папку. */
  dnd?: ListRowDndProps;
}

/** Строка списка в сайдбаре: переход, настройки (имя/цвет/иконка), удаление. */
export function ListRow({ list, onError, dnd }: ListRowProps) {
  const { pathname } = useLocation();
  const active = pathname === `/list/${list.id}`;

  const updateList = useUpdateList();
  const trashList = useTrashList();

  async function applyStyle(input: PatchListDto) {
    try {
      await updateList.mutateAsync({ listId: list.id, input });
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  async function onDelete() {
    if (!window.confirm(`Удалить список «${list.name}»? Задачи попадут в корзину.`)) {
      return;
    }
    try {
      await trashList.mutateAsync(list.id);
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  const editable = list.kind !== "inbox";

  return (
    <div
      className={cn(
        "group flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover",
        active && "bg-surface-selected",
        dnd?.dragging && "opacity-40",
        dnd?.over && "bg-surface-selected ring-1 ring-primary",
      )}
      draggable={dnd !== undefined}
      onDragStart={dnd?.onDragStart}
      onDragOver={dnd?.onDragOver}
      onDragLeave={dnd?.onDragLeave}
      onDrop={dnd?.onDrop}
      onDragEnd={dnd?.onDragEnd}
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left"
        to={`/list/${list.id}`}
      >
        {list.kind === "inbox" ? (
          <InboxIcon aria-hidden className="size-4 shrink-0 text-primary-text" />
        ) : (
          <EntityMarker icon={list.icon} color={list.color} />
        )}
        <span className="truncate">{list.name}</span>
      </Link>
      {editable ? (
        <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <EntityStylePopover
            title={`Настройки списка «${list.name}»`}
            style={{ name: list.name, color: list.color, icon: list.icon }}
            onChange={(patch) => void applyStyle(patch)}
          />
          <button
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
            type="button"
            title="Удалить"
            onClick={onDelete}
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
