import { useState } from "react";
import { Link, useLocation } from "react-router";
import type { ListDto } from "@plana/shared";
import { useTrashList, useUpdateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
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
      <input
        className="rename-input"
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
    <div className={active ? "row row-active" : "row"}>
      <Link className="row-link" to={`/list/${list.id}`}>
        {list.emoji ? (
          <span aria-hidden>{list.emoji}</span>
        ) : (
          <span className="dot" style={{ background: LIST_DOT_COLORS[list.color] }} aria-hidden />
        )}
        <span className="row-name">{list.name}</span>
      </Link>
      {editable && (
        <span className="row-actions">
          <button
            className="icon-btn"
            type="button"
            title="Переименовать"
            onClick={() => setEditing(true)}
          >
            ✎
          </button>
          <button className="icon-btn" type="button" title="Удалить" onClick={onDelete}>
            ✕
          </button>
        </span>
      )}
    </div>
  );
}
