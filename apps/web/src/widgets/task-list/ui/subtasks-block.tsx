import { useState } from "react";
import { CornerUpRightIcon, XIcon } from "lucide-react";
import type { TaskDto } from "@plana/shared";
import { useDeleteSubtask, usePromoteSubtask, useUpdateSubtask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { SUBTASK_DRAG_MIME, encodeSubtaskDrag } from "@/shared/lib/task-drag-mime";
import { Checkbox } from "@/shared/ui";

interface SubtasksBlockProps {
  task: TaskDto;
}

/**
 * Чеклист подзадач: отметить, вынести в отдельную задачу, удалить.
 * Новые подзадачи добавляются Shift+Enter в инлайн-режиме названия задачи.
 * Строка подзадачи перетаскивается наружу (SUBTASK_DRAG_MIME): дроп на
 * строку задачи / список в сайдбаре выносит её из родителя.
 */
export function SubtasksBlock({ task }: SubtasksBlockProps) {
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const promoteSubtask = usePromoteSubtask();

  async function toggle(subtaskId: string, done: boolean) {
    try {
      await updateSubtask.mutateAsync({ subtaskId, done: !done });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function remove(subtaskId: string) {
    try {
      await deleteSubtask.mutateAsync(subtaskId);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Подзадача становится отдельной задачей сразу после родительской. */
  async function promote(subtaskId: string) {
    try {
      await promoteSubtask.mutateAsync(subtaskId);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div className="flex flex-col gap-1 px-2 pb-2">
      <ul className="flex flex-col gap-0.5">
        {task.subtasks.map((subtask) => (
          <li
            className={cn(
              "group/subtask flex items-center gap-2 rounded-md px-2 py-1",
              draggingId === subtask.id && "opacity-40",
            )}
            key={subtask.id}
            draggable
            onDragStart={(event) => {
              // Не даём строке родительской задачи перезаписать dataTransfer.
              event.stopPropagation();
              setDraggingId(subtask.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(
                SUBTASK_DRAG_MIME,
                encodeSubtaskDrag({ subtaskId: subtask.id, parentTaskId: task.id }),
              );
              // Для Firefox обязателен text/plain; содержимое не используется.
              event.dataTransfer.setData("text/plain", subtask.title);
            }}
            onDragEnd={() => setDraggingId(null)}
          >
            <Checkbox
              size="sm"
              checked={subtask.done}
              onCheckedChange={() => void toggle(subtask.id, subtask.done)}
              aria-label={subtask.done ? "Снять отметку" : "Отметить"}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                subtask.done && "text-muted-foreground line-through",
              )}
            >
              {subtask.title}
            </span>
            <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/subtask:opacity-100 focus-within:opacity-100">
              <button
                className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
                title="Сделать отдельной задачей"
                type="button"
                onClick={() => void promote(subtask.id)}
              >
                <CornerUpRightIcon className="size-3" />
              </button>
              <button
                className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
                title="Удалить"
                type="button"
                onClick={() => void remove(subtask.id)}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
