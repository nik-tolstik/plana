import { useRef, useState } from "react";
import type { ListDto, PatchListDto, SidebarDto } from "@plana/shared";
import { usePromoteSubtask, useUpdateTask } from "@/features/task-manage";
import { useUpdateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { SUBTASK_DRAG_MIME, TASK_DRAG_MIME, decodeSubtaskDrag } from "@/shared/lib/task-drag-mime";
import type { FolderDndProps } from "../ui/folder-group";
import type { ListRowDndProps, ListRowTaskDropProps } from "../ui/list-row";
import type { SectionHeaderDndProps } from "../ui/section-header";

/** Куда встанет тащимый список. */
type DropTarget =
  | { type: "list"; id: string; edge: "before" | "after" }
  | { type: "folder"; id: string }
  | { type: "root" }
  | null;

/**
 * DnD-движок сайдбара: сортировка проектов, перенос между корнем и папками
 * и приём задач/подзадач, перетащенных со страниц списков.
 */
export function useSidebarDnd(sidebar: SidebarDto | undefined, onError: (message: string) => void) {
  const updateList = useUpdateList();
  const updateTask = useUpdateTask();
  const promoteSubtask = usePromoteSubtask();

  // Идентификатор тащимого списка — в ref: dragover/drop приходят до нового
  // рендера, замыкание со стейтом было бы устаревшим.
  const dragListIdRef = useRef<string | null>(null);
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [taskOverListId, setTaskOverListId] = useState<string | null>(null);

  const findList = (listId: string | null): ListDto | undefined => {
    if (!sidebar || !listId) return undefined;
    return [sidebar.inbox, ...sidebar.rootLists, ...sidebar.folders.flatMap((f) => f.lists)].find(
      (candidate) => candidate.id === listId,
    );
  };

  /**
   * Соседи контейнера (null = корень) без тащимого списка. Для корня Inbox
   * тоже сосед (API нумерует корень вместе с ним, position 0) — иначе
   * пересчёт индекса вставки смещается на единицу.
   */
  const siblingsOf = (folderId: string | null, withoutId: string): ListDto[] => {
    if (!sidebar) return [];
    const lists =
      folderId === null
        ? [sidebar.inbox, ...sidebar.rootLists]
        : (sidebar.folders.find((f) => f.id === folderId)?.lists ?? []);
    return lists.filter((list) => list.id !== withoutId);
  };

  function clearDrag() {
    dragListIdRef.current = null;
    setDragListId(null);
    setDropTarget(null);
  }

  /** Дроп на список: встаём выше/ниже цели в её контейнере. */
  async function dropOnList(targetId: string, edge: "before" | "after") {
    const sourceId = dragListIdRef.current;
    clearDrag();
    const source = findList(sourceId);
    const target = findList(targetId);
    if (!source || !target || source.id === target.id) return;
    const containerId = target.folderId;
    const siblings = siblingsOf(containerId, source.id);
    const targetIndex = siblings.findIndex((list) => list.id === target.id);
    if (targetIndex < 0) return;
    const input: PatchListDto = { position: edge === "after" ? targetIndex + 1 : targetIndex };
    if (source.folderId !== containerId) {
      input.folderId = containerId;
    }
    try {
      await updateList.mutateAsync({ listId: source.id, input });
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  /** Дроп на шапку папки: кладём тащимый список в конец этой папки. */
  async function dropOnFolder(folderId: string) {
    const sourceId = dragListIdRef.current;
    clearDrag();
    const source = findList(sourceId);
    if (!source || source.folderId === folderId) return;
    try {
      await updateList.mutateAsync({ listId: source.id, input: { folderId } });
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  /** Дроп на заголовок «Проекты»: выносим список из папки в конец корня. */
  async function dropOnRoot() {
    const sourceId = dragListIdRef.current;
    clearDrag();
    const source = findList(sourceId);
    if (!source || source.folderId === null) return;
    try {
      await updateList.mutateAsync({ listId: source.id, input: { folderId: null } });
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  const listDnd = (list: ListDto): ListRowDndProps => ({
    dragging: dragListId === list.id,
    edge:
      dropTarget?.type === "list" && dropTarget.id === list.id && dragListId !== null
        ? dropTarget.edge
        : null,
    onDragStart: (event: React.DragEvent) => {
      dragListIdRef.current = list.id;
      setDragListId(list.id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", list.id);
    },
    onDragOver: (event: React.DragEvent) => {
      const sourceId = dragListIdRef.current;
      if (sourceId === null || sourceId === list.id) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const rect = event.currentTarget.getBoundingClientRect();
      const edge: "before" | "after" =
        event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      setDropTarget((current) =>
        current?.type === "list" && current.id === list.id && current.edge === edge
          ? current
          : { type: "list", id: list.id, edge },
      );
    },
    onDragLeave: () =>
      setDropTarget((current) =>
        current?.type === "list" && current.id === list.id ? null : current,
      ),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      // edge считаем по геометрии на момент дропа: state мог не закоммититься.
      const rect = event.currentTarget.getBoundingClientRect();
      const edge: "before" | "after" =
        event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      void dropOnList(list.id, edge);
    },
    onDragEnd: clearDrag,
  });

  const folderDnd = (folderId: string): FolderDndProps => ({
    overFolder: dropTarget?.type === "folder" && dropTarget.id === folderId && dragListId !== null,
    onHeaderDragOver: (event: React.DragEvent) => {
      const sourceId = dragListIdRef.current;
      if (sourceId === null) return;
      const source = findList(sourceId);
      if (!source || source.folderId === folderId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget({ type: "folder", id: folderId });
    },
    onHeaderDragLeave: () =>
      setDropTarget((current) =>
        current?.type === "folder" && current.id === folderId ? null : current,
      ),
    onHeaderDrop: (event: React.DragEvent) => {
      event.preventDefault();
      void dropOnFolder(folderId);
    },
  });

  /** Приём дропа задачи или подзадачи на строку списка (включая Inbox). */
  const taskDropFor = (list: ListDto): ListRowTaskDropProps => ({
    over: taskOverListId === list.id,
    onDragOver: (event: React.DragEvent) => {
      const types = event.dataTransfer.types;
      if (!types.includes(TASK_DRAG_MIME) && !types.includes(SUBTASK_DRAG_MIME)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setTaskOverListId(list.id);
    },
    onDragLeave: () => setTaskOverListId((current) => (current === list.id ? null : current)),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setTaskOverListId(null);
      // Подзадача: сначала отдельная задача (promote), затем перенос в список.
      if (event.dataTransfer.types.includes(SUBTASK_DRAG_MIME)) {
        const payload = decodeSubtaskDrag(event.dataTransfer.getData(SUBTASK_DRAG_MIME));
        if (!payload) return;
        promoteSubtask
          .mutateAsync(payload.subtaskId)
          .then((created) =>
            updateTask.mutateAsync({ taskId: created.id, listId: list.id, sectionId: null }),
          )
          .catch((cause) => onError(errorMessage(cause)));
        return;
      }
      const taskId = event.dataTransfer.getData(TASK_DRAG_MIME);
      if (!taskId) return;
      // Сервер ставит задачу в конец целевого списка (position не задан).
      updateTask
        .mutateAsync({ taskId, listId: list.id, sectionId: null })
        .catch((cause) => onError(errorMessage(cause)));
    },
  });

  const rootDnd: SectionHeaderDndProps = {
    over: dropTarget?.type === "root" && dragListId !== null,
    onDragOver: (event: React.DragEvent) => {
      const sourceId = dragListIdRef.current;
      if (sourceId === null) return;
      const source = findList(sourceId);
      if (!source || source.folderId === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget({ type: "root" });
    },
    onDragLeave: () => setDropTarget((current) => (current?.type === "root" ? null : current)),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      void dropOnRoot();
    },
  };

  return { listDnd, folderDnd, taskDropFor, rootDnd };
}
