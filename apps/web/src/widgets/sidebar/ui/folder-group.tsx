import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDownIcon, PlusIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import type { ListDto } from "@plana/shared";
import type { FolderDto } from "@/entities/folder";
import { useDeleteFolder, useUpdateFolder } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { ConfirmDeleteDialog, Input } from "@/shared/ui";
import { CreateEntityDialog } from "./create-entity-dialog";
import { ListRow, type ListRowDndProps } from "./list-row";

type FolderWithLists = FolderDto & { lists: ListDto[] };

export interface FolderDndProps {
  /** Шапка папки — цель «переложить тащимый проект в эту папку». */
  overFolder: boolean;
  onHeaderDragOver: (event: React.DragEvent) => void;
  onHeaderDragLeave: () => void;
  onHeaderDrop: (event: React.DragEvent) => void;
}

interface FolderGroupProps {
  folder: FolderWithLists;
  onError: (message: string) => void;
  /** DnD-пропсы для строк-списков (общие с корневыми списками). */
  dndFor: (list: ListDto) => ListRowDndProps;
  folderDnd: FolderDndProps;
}

/** Раскрывающаяся папка: шапка — цель переноса, внутри — сортируемые списки. */
export function FolderGroup({ folder, onError, dndFor, folderDnd }: FolderGroupProps) {
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(folder.name);
  const prefersReducedMotion = useReducedMotion();

  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

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

  return (
    <div>
      <div
        className={cn(
          "group flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover",
          folderDnd.overFolder && "bg-surface-selected ring-1 ring-primary",
        )}
        onDragOver={folderDnd.onHeaderDragOver}
        onDragLeave={folderDnd.onHeaderDragLeave}
        onDrop={folderDnd.onHeaderDrop}
      >
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
                title="Добавить проект в папку"
                onClick={() => {
                  setOpen(true);
                  setCreating(true);
                }}
              >
                <PlusIcon className="size-3.5" />
              </button>
              <button
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
                type="button"
                title="Переименовать папку"
                onClick={() => setEditing(true)}
              >
                <SettingsIcon className="size-3.5" />
              </button>
              <button
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
                type="button"
                title="Удалить папку"
                onClick={() => setConfirming(true)}
              >
                <Trash2Icon className="size-3.5" />
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
                <motion.div
                  key={list.id}
                  layout={!prefersReducedMotion}
                  layoutId={prefersReducedMotion ? undefined : list.id}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <ListRow key={list.id} list={list} onError={onError} dnd={dndFor(list)} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <CreateEntityDialog
        kind="list"
        folderId={folder.id}
        open={creating}
        onOpenChange={setCreating}
        onError={onError}
      />
      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Удалить папку «${folder.name}»?`}
        description="Проекты останутся, но без папки."
        onConfirm={async () => {
          try {
            await deleteFolder.mutateAsync(folder.id);
          } catch (cause) {
            onError(errorMessage(cause));
          }
        }}
      />
    </div>
  );
}
