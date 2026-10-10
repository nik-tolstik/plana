import { useState } from "react";
import type { TaskDto } from "@plana/shared";
import { useCreateSubtask, useDeleteSubtask, useUpdateSubtask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";

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
    <div className="subtasks">
      <ul className="subtasks-list">
        {task.subtasks.map((subtask) => (
          <li className="subtask-row" key={subtask.id}>
            <button
              aria-label={subtask.done ? "Снять отметку" : "Отметить"}
              className={`task-check small${subtask.done ? " checked" : ""}`}
              type="button"
              onClick={() => void toggle(subtask.id, subtask.done)}
            />
            <span className={subtask.done ? "subtask-done" : undefined}>{subtask.title}</span>
            <button
              className="icon-btn"
              title="Удалить"
              type="button"
              onClick={() => void remove(subtask.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <input
        aria-label="Новая подзадача"
        className="subtask-input"
        placeholder="+ подзадача"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            void add();
          }
        }}
      />
      {error && <p className="task-error">{error}</p>}
    </div>
  );
}
