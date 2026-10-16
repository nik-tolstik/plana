import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { PatchTaskDto, TaskDto } from "@plana/shared";
import {
  useCompleteTask,
  useCreateSubtask,
  useCreateTask,
  useRestoreTask,
  useTrashTask,
  useUncompleteTask,
  useUpdateTask,
} from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import type { TaskEditingState } from "./editing";

interface TaskRowActionsArgs {
  task: TaskDto;
  /** Инлайн-ввод: владелец состояния — TaskListView. */
  onEditingChange: (editing: TaskEditingState | null) => void;
}

/**
 * Поведение строки задачи: завершение, корзина, инлайн-правка названия,
 * ввод новой задачи/подзадачи и общий PATCH для чипов и контекстного меню.
 */
export function useTaskRowActions({ task, onEditingChange }: TaskRowActionsArgs) {
  const [expanded, setExpanded] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Завершение в два такта: сначала галочка чекбокса (checking), затем
  // схлопывание строки (collapsing) — и только потом PATCH. Одновременный
  // старт обрезает анимацию галочки: строка исчезает раньше, чем она доиграет.
  const [completeStage, setCompleteStage] = useState<"idle" | "checking" | "collapsing">("idle");
  const completing = completeStage !== "idle";
  const collapsing = completeStage === "collapsing";
  const prefersReducedMotion = useReducedMotion();

  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const trash = useTrashTask();
  const restore = useRestoreTask();
  const update = useUpdateTask();
  const createTask = useCreateTask();
  const createSubtask = useCreateSubtask();

  // Смена задачи (invalidate) сбрасывает черновик названия.
  useEffect(() => {
    setTitleDraft(task.title);
  }, [task.title]);

  async function toggleComplete() {
    if (completeStage !== "idle") return;
    if (task.completedAt === null) {
      setCompleteStage("checking");
      try {
        if (!prefersReducedMotion) {
          // Такт 1: галочка доигрывает spring (~300 мс) на месте строки.
          await new Promise((resolve) => setTimeout(resolve, 300));
          setCompleteStage("collapsing");
          // Такт 2: строка сворачивается (0.22 с в task-row), затем PATCH.
          await new Promise((resolve) => setTimeout(resolve, 240));
        }
        await complete.mutateAsync(task.id);
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setCompleteStage("idle");
      }
    } else {
      try {
        await uncomplete.mutateAsync(task.id);
      } catch (cause) {
        setError(errorMessage(cause));
      }
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

  /** Сохранить отредактированное название (если менялось). */
  async function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed.length === 0 || trimmed === task.title) {
      setTitleDraft(task.title);
      return;
    }
    try {
      await update.mutateAsync({ taskId: task.id, title: trimmed });
    } catch (cause) {
      setError(errorMessage(cause));
      setTitleDraft(task.title);
    }
  }

  /** Enter в правке названия: сохранить и продолжить строкой новой задачи. */
  function handleTitleEnter() {
    void commitTitle();
    setDraft("");
    onEditingChange({ taskId: task.id, mode: "new-task" });
  }

  /** Shift+Enter в правке названия: сохранить и продолжить строкой подзадачи. */
  function handleTitleShiftEnter() {
    void commitTitle();
    setDraft("");
    setExpanded(true);
    onEditingChange({ taskId: task.id, mode: "new-subtask" });
  }

  /** Blur названия: просто сохранить и выйти из правки (без открытия панели). */
  function handleTitleBlur() {
    void commitTitle();
    onEditingChange(null);
  }

  /** Enter в строке новой задачи: создать под текущей, ввод переезжает в неё. */
  async function commitNewTask() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onEditingChange(null);
      return;
    }
    try {
      const created = await createTask.mutateAsync({
        title: trimmed,
        // Контекст текущей строки: тот же список/секция/дата.
        listId: task.listId,
        sectionId: task.sectionId,
        dueDate: task.dueDate,
        afterTaskId: task.id,
      });
      setDraft("");
      onEditingChange({ taskId: created.id, mode: "new-task" });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Shift+Enter в строке новой задачи: этот текст станет подзадачей текущей. */
  async function commitNewTaskAsSubtask() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onEditingChange(null);
      return;
    }
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: trimmed });
      setDraft("");
      setExpanded(true);
      onEditingChange({ taskId: task.id, mode: "new-subtask" });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function commitNewSubtask() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onEditingChange(null);
      return;
    }
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: trimmed });
      setDraft("");
      // Остаемся в режиме: можно вводить следующую подзадачу.
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Общий PATCH для чипов и контекстного меню (дата/приоритет/список). */
  async function patchTask(input: PatchTaskDto) {
    try {
      await update.mutateAsync({ taskId: task.id, ...input });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return {
    expanded,
    setExpanded,
    titleDraft,
    setTitleDraft,
    draft,
    setDraft,
    error,
    completing,
    collapsing,
    toggleComplete,
    remove,
    restoreFromTrash,
    patchTask,
    handleTitleEnter,
    handleTitleShiftEnter,
    handleTitleBlur,
    commitNewTask,
    commitNewTaskAsSubtask,
    commitNewSubtask,
  };
}
