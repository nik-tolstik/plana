import { useMemo, useState } from "react";
import type { TaskDto } from "@plana/shared";
import { useUpdateTask } from "@/features/task-manage";

interface DragState {
  draggingId: string | null;
  overId: string | null;
}

/** Пропсы перетаскивания, прокидываются в строку задачи. */
export interface TaskDragProps {
  draggingId: string | null;
  overId: string | null;
  onDragStart: (task: TaskDto, event: React.DragEvent) => void;
  onDragOver: (task: TaskDto, event: React.DragEvent) => void;
  onDrop: (task: TaskDto, event: React.DragEvent) => void;
  onDragEnd: () => void;
}

/**
 * Drag&drop задач на страницах списков: сброс на другую строку ставит задачу
 * перед ней (position = индекс в целевом контейнере; перенос между секциями
 * меняет sectionId). Задачи передаются в порядке отображения.
 */
export function useTaskDragReorder(options: {
  enabled: boolean;
  /** Задачи списка (не завершённые, не в корзине) в порядке отображения. */
  tasks: TaskDto[];
}): TaskDragProps | undefined {
  const [state, setState] = useState<DragState>({ draggingId: null, overId: null });
  const update = useUpdateTask();

  const { enabled, tasks } = options;

  return useMemo<TaskDragProps | undefined>(() => {
    if (!enabled) {
      return undefined;
    }
    return {
      draggingId: state.draggingId,
      overId: state.overId,
      onDragStart(task, event) {
        setState({ draggingId: task.id, overId: null });
        event.dataTransfer.effectAllowed = "move";
        // Обязателен для Firefox, содержимое не используется.
        event.dataTransfer.setData("text/plain", task.id);
      },
      onDragOver(task, event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (state.overId !== task.id) {
          setState((current) => ({ ...current, overId: task.id }));
        }
      },
      onDrop(target, event) {
        event.preventDefault();
        const draggingId = state.draggingId;
        setState({ draggingId: null, overId: null });
        if (draggingId === null || draggingId === target.id) {
          return;
        }
        const dragging = tasks.find((task) => task.id === draggingId);
        if (!dragging) {
          return;
        }
        // Контейнер цели без перетаскиваемой задачи; вставка перед целью.
        const container = tasks.filter(
          (task) =>
            task.id !== draggingId &&
            task.listId === target.listId &&
            (task.sectionId ?? null) === (target.sectionId ?? null),
        );
        const index = container.findIndex((task) => task.id === target.id);
        const position = index === -1 ? container.length : index;
        void update.mutateAsync({
          taskId: draggingId,
          listId: target.listId,
          sectionId: target.sectionId,
          position,
        });
      },
      onDragEnd() {
        setState({ draggingId: null, overId: null });
      },
    };
  }, [enabled, state, tasks, update]);
}
