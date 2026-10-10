import { useState } from "react";
import type { TaskDto } from "@plana/shared";
import {
  useCompleteTask,
  useRestoreTask,
  useTrashTask,
  useUncompleteTask,
} from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { SubtasksBlock } from "./subtasks-block";
import { taskDueLabel } from "../model/grouping";

const PRIORITY_FLAG: Record<string, string> = { low: "🚩", medium: "🔺", high: "🔴" };

interface TaskRowProps {
  task: TaskDto;
  today: string;
  /** Дата уже прошла — подсветить. */
  showOverdue?: boolean;
  onOpenDetails: (taskId: string) => void;
}

export function TaskRow({ task, today, showOverdue = true, onOpenDetails }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const trash = useTrashTask();
  const restore = useRestoreTask();

  const doneCount = task.subtasks.filter((subtask) => subtask.done).length;
  const dueLabel = taskDueLabel(task, today);
  const overdue =
    showOverdue &&
    task.dueDate !== null &&
    task.dueDate < today &&
    task.completedAt === null &&
    task.trashedAt === null;

  async function toggleComplete() {
    try {
      if (task.completedAt === null) {
        await complete.mutateAsync(task.id);
      } else {
        await uncomplete.mutateAsync(task.id);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function remove() {
    try {
      await trash.mutateAsync(task.id);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function restoreFromTrash() {
    try {
      await restore.mutateAsync(task.id);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <li className={`task-row${task.completedAt ? " task-done" : ""}`}>
      <div className="task-line">
        <button
          aria-label={task.completedAt ? "Вернуть в работу" : "Завершить"}
          className={`task-check${task.completedAt ? " checked" : ""}`}
          type="button"
          onClick={() => void toggleComplete()}
        />
        <button className="task-title" type="button" onClick={() => onOpenDetails(task.id)}>
          {task.title}
        </button>

        {task.pinned && <span title="Закреплено">📌</span>}
        {task.priority !== "none" && (
          <span title="Приоритет">{PRIORITY_FLAG[task.priority] ?? "⚑"}</span>
        )}
        {dueLabel && <span className={overdue ? "task-due overdue" : "task-due"}>{dueLabel}</span>}
        <button
          className="task-subtasks-toggle"
          title="Подзадачи"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "▾" : "▸"}
          {task.subtasks.length > 0 ? ` ${doneCount}/${task.subtasks.length}` : " +"}
        </button>
        {task.trashedAt ? (
          <button
            className="icon-btn"
            title="Восстановить"
            type="button"
            onClick={() => void restoreFromTrash()}
          >
            ↺
          </button>
        ) : (
          <button className="icon-btn" title="Удалить" type="button" onClick={() => void remove()}>
            ✕
          </button>
        )}
      </div>

      {expanded && <SubtasksBlock task={task} />}
      {error && <p className="task-error">{error}</p>}
    </li>
  );
}
