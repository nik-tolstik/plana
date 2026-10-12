import { useState } from "react";
import { XIcon } from "lucide-react";
import type { TaskDto } from "@plana/shared";
import { useCreateSubtask, useDeleteSubtask, useUpdateSubtask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { Checkbox, Input } from "@/shared/ui";

interface SubtasksBlockProps {
  task: TaskDto;
}

/** Чеклист подзадач: отметить, добавить, удалить. */
export function SubtasksBlock({ task }: SubtasksBlockProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  async function add() {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: trimmed });
      setTitle("");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

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

  return (
    <div className="flex flex-col gap-1 px-2 pb-2">
      <ul className="flex flex-col gap-0.5">
        {task.subtasks.map((subtask) => (
          <li
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-hover"
            key={subtask.id}
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
            <button
              className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
              title="Удалить"
              type="button"
              onClick={() => void remove(subtask.id)}
            >
              <XIcon className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <Input
        className="min-h-8"
        aria-label="Новая подзадача"
        placeholder="+ подзадача"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            void add();
          }
        }}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
