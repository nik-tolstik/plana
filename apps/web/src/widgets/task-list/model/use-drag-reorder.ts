import { useMemo, useState } from "react";
import type { TaskDto } from "@plana/shared";
import { useNestTask, useUpdateTask } from "@/features/task-manage";
import { TASK_DRAG_MIME } from "@/shared/lib/task-drag-mime";

export { TASK_DRAG_MIME } from "@/shared/lib/task-drag-mime";

export type DropZone = "before" | "after" | "inside";

interface DragState {
  draggingId: string | null;
  over: { id: string; zone: DropZone } | null;
}

/** Пропсы перетаскивания, прокидываются в строку задачи. */
export interface TaskDragProps {
  draggingId: string | null;
  over: { id: string; zone: DropZone } | null;
  onDragStart: (task: TaskDto, event: React.DragEvent) => void;
  onDragOver: (task: TaskDto, event: React.DragEvent) => void;
  onDrop: (task: TaskDto, event: React.DragEvent) => void;
  onDragEnd: () => void;
}

/** Зона строки под курсором: верх/низ — вставка рядом, центр — вложить подзадачей. */
function zoneOf(event: React.DragEvent): DropZone {
  const rect = event.currentTarget.getBoundingClientRect();
  const offset = event.clientY - rect.top;
  if (offset < rect.height * 0.3) return "before";
  if (offset > rect.height * 0.7) return "after";
  return "inside";
}

/**
 * Drag&drop задач на страницах списков: верхняя/нижняя зона строки ставит
 * задачу перед/после цели (position = индекс в контейнере без перетаскиваемой),
 * центральная — вкладывает задачу подзадачей цели (nest). Задачи передаются
 * в порядке отображения.
 */
export function useTaskDragReorder(options: {
  enabled: boolean;
  /** Задачи списка (не завершённые, не в корзине) в порядке отображения. */
  tasks: TaskDto[];
}): TaskDragProps | undefined {
  const [state, setState] = useState<DragState>({ draggingId: null, over: null });
  const update = useUpdateTask();
  const nest = useNestTask();

  const { enabled, tasks } = options;

  return useMemo<TaskDragProps | undefined>(() => {
    if (!enabled) {
      return undefined;
    }
    return {
      draggingId: state.draggingId,
      over: state.over,
      onDragStart(task, event) {
        setState({ draggingId: task.id, over: null });
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(TASK_DRAG_MIME, task.id);
        // Для Firefox обязателен text/plain; содержимое не используется.
        event.dataTransfer.setData("text/plain", task.id);
      },
      onDragOver(task, event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const zone = zoneOf(event);
        if (state.over?.id === task.id && state.over.zone === zone) {
          return;
        }
        setState((current) => ({
          ...current,
          over: { id: task.id, zone },
        }));
      },
      onDrop(target, event) {
        event.preventDefault();
        const draggingId = state.draggingId;
        const zone = zoneOf(event);
        setState({ draggingId: null, over: null });
        if (draggingId === null || draggingId === target.id) {
          return;
        }
        const dragging = tasks.find((task) => task.id === draggingId);
        if (!dragging) {
          return;
        }
        if (zone === "inside") {
          void nest.mutateAsync({ taskId: draggingId, parentTaskId: target.id });
          return;
        }
        // Контейнер цели без перетаскиваемой задачи; вставка перед/после цели.
        const container = tasks.filter(
          (task) =>
            task.id !== draggingId &&
            task.listId === target.listId &&
            (task.sectionId ?? null) === (target.sectionId ?? null),
        );
        const index = container.findIndex((task) => task.id === target.id);
        if (index === -1) {
          return;
        }
        void update.mutateAsync({
          taskId: draggingId,
          listId: target.listId,
          sectionId: target.sectionId,
          position: zone === "after" ? index + 1 : index,
        });
      },
      onDragEnd() {
        setState({ draggingId: null, over: null });
      },
    };
  }, [enabled, state, tasks, update, nest]);
}
