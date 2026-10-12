import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDownIcon, PencilIcon, PlusIcon, XIcon } from "lucide-react";
import type { ListDto } from "@plana/shared";
import type { FolderDto } from "@/entities/folder";
import { useCreateList, useDeleteFolder, useUpdateFolder } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { Input } from "@/shared/ui";
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
  const prefersReducedMotion = useReducedMotion();

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
    <div>
      <div className="group flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover">
        {editing ? (
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
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1 text-left font-semibold"
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <motion.span
                aria-hidden
                className="flex items-center"
                animate={{ rotate: open ? 0 : -90 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </motion.span>
              <span className="truncate">{folder.name}</span>
            </button>
            <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
                type="button"
                title="Добавить список в папку"
                onClick={() => {
                  setOpen(true);
                  setAddingList(true);
                }}
              >
                <PlusIcon className="size-3.5" />
              </button>
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
          </>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="folder-lists"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 pl-4">
              {folder.lists.map((list) => (
                <ListRow key={list.id} list={list} onError={onError} />
              ))}
              {addingList ? (
                <AddForm
                  placeholder="Название списка"
                  onSubmit={addList}
                  onCancel={() => setAddingList(false)}
                />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
