import { useState } from "react";
import { Link, useLocation } from "react-router";
import { PencilIcon, XIcon } from "lucide-react";
import type { ListDto } from "@plana/shared";
import { useTrashList, useUpdateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui";
import { LIST_DOT_COLORS } from "../model/colors";

interface ListRowProps {
  list: ListDto;
  onError: (message: string) => void;
}

/** Строка списка в сайдбаре: переход, инлайн-переименование, удаление. Inbox — без действий. */
export function ListRow({ list, onError }: ListRowProps) {
  const { pathname } = useLocation();
  const active = pathname === `/list/${list.id}`;

  const updateList = useUpdateList();
  const trashList = useTrashList();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);

  async function saveRename() {
    const trimmed = name.trim();
    setEditing(false);
    if (!trimmed || trimmed === list.name) {
      setName(list.name);
      return;
    }
    try {
      await updateList.mutateAsync({ listId: list.id, input: { name: trimmed } });
    } catch (error) {
      setName(list.name);
      onError(errorMessage(error));
    }
  }

  async function onDelete() {
    if (!window.confirm(`Удалить список «${list.name}»? Задачи попадут в корзину.`)) {
      return;
    }
    try {
      await trashList.mutateAsync(list.id);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  if (editing) {
    return (
      <Input
        className="min-h-7"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={saveRename}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            saveRename();
          }
          if (event.key === "Escape") {
            setName(list.name);
            setEditing(false);
          }
        }}
        autoFocus
        aria-label="Новое название списка"
      />
    );
  }

  const editable = list.kind !== "inbox";

  return (
    <div
      className={cn(
        "group flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover",
        active && "bg-surface-selected",
      )}
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left"
        to={`/list/${list.id}`}
      >
        {list.emoji ? (
          <span aria-hidden>{list.emoji}</span>
        ) : (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: LIST_DOT_COLORS[list.color] }}
            aria-hidden
          />
        )}
        <span className="truncate">{list.name}</span>
      </Link>
      {editable ? (
        <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
            type="button"
            title="Переименовать"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-3.5" />
          </button>
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
