import { useState } from "react";
import type { ListDto } from "@plana/shared";
import type { FolderDto } from "@/entities/folder";
import { useCreateList, useDeleteFolder, useUpdateFolder } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { AddForm } from "./add-form";
import { ListRow } from "./list-row";

type FolderWithLists = FolderDto & { lists: ListDto[] };

/** Раскрывающаяся папка со списками; внутри можно добавить список в эту папку. */
export function FolderGroup({
  folder,
  onError,
}: {
  folder: FolderWithLists;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [addingList, setAddingList] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const createList = useCreateList();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  async function addList(name: string) {
    try {
      await createList.mutateAsync({ name, folderId: folder.id });
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  async function saveRename() {
    const trimmed = name.trim();
    setEditing(false);
    if (!trimmed || trimmed === folder.name) {
      setName(folder.name);
      return;
    }
    try {
      await updateFolder.mutateAsync({ folderId: folder.id, input: { name: trimmed } });
    } catch (error) {
      setName(folder.name);
      onError(errorMessage(error));
    }
  }

  async function onDelete() {
    if (!window.confirm(`Удалить папку «${folder.name}»? Списки останутся без папки.`)) {
      return;
    }
    try {
      await deleteFolder.mutateAsync(folder.id);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  return (
    <div className="folder-group">
      <div className="row">
        {editing ? (
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
                setName(folder.name);
                setEditing(false);
              }
            }}
            autoFocus
            aria-label="Новое название папки"
          />
        ) : (
          <>
            <button
              className="row-link folder-toggle"
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <span aria-hidden>{open ? "▾" : "▸"}</span>
              <span className="row-name">{folder.name}</span>
            </button>
            <span className="row-actions">
              <button
                className="icon-btn"
                type="button"
                title="Добавить список в папку"
                onClick={() => {
                  setOpen(true);
                  setAddingList(true);
                }}
              >
                +
              </button>
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
          </>
        )}
      </div>
      {open && (
        <div className="folder-lists">
          {folder.lists.map((list) => (
            <ListRow key={list.id} list={list} onError={onError} />
          ))}
          {addingList && (
            <AddForm
              placeholder="Название списка"
              onSubmit={addList}
              onCancel={() => setAddingList(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
