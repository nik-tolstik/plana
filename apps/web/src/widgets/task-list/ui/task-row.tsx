import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FlagIcon, PinIcon, RepeatIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { rruleValueLabel, type TaskDto, type TaskPriority } from "@plana/shared";
import {
  useCompleteTask,
  useRestoreTask,
  useTrashTask,
  useUncompleteTask,
} from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { Checkbox } from "@/shared/ui";
import { SubtasksBlock } from "./subtasks-block";
import { taskDueLabel } from "../model/grouping";
import type { TaskDragProps } from "../model/use-drag-reorder";

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  none: "",
  low: "text-priority-low",
  medium: "text-priority-medium",
  high: "text-priority-high",
};

interface TaskRowProps {
  task: TaskDto;
  today: string;
  /** Дата уже прошла — подсветить. */
  showOverdue?: boolean;
  onOpenDetails: (taskId: string) => void;
  /** Перетаскивание (только страницы списков). */
  dnd?: TaskDragProps;
  /** Задержка stagger-появления (передаётся группой). */
  delayMs?: number;
}

export function TaskRow({
  task,
  today,
  showOverdue = true,
  onOpenDetails,
  dnd,
  delayMs = 0,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
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
  const dropping = dnd?.overId === task.id && dnd.draggingId !== task.id;

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
    // li — обычный (не motion): HTML5 drag-события не должны перехватываться
    // motion-жестами; появление строки анимирует вложенный motion.div.
    <li
      className={cn(
        "relative flex flex-col rounded-lg transition-colors hover:bg-surface-hover",
        task.completedAt !== null && "opacity-60",
        dnd?.draggingId === task.id && "opacity-40",
        dropping && "shadow-[inset_0_2px_0_0_var(--primary)]",
      )}
      draggable={dnd !== undefined}
      onDragStart={dnd ? (event) => dnd.onDragStart(task, event) : undefined}
      onDragOver={dnd ? (event) => dnd.onDragOver(task, event) : undefined}
      onDrop={dnd ? (event) => dnd.onDrop(task, event) : undefined}
      onDragEnd={dnd ? dnd.onDragEnd : undefined}
    >
      <motion.div
        className="flex flex-col"
        initial={prefersReducedMotion || dnd ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: delayMs / 1000 }}
      >
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Checkbox
            size="lg"
            checked={task.completedAt !== null}
            onCheckedChange={() => void toggleComplete()}
            aria-label={task.completedAt ? "Вернуть в работу" : "Завершить"}
          />
          <button
            className={cn(
              "min-w-0 flex-1 cursor-pointer truncate text-left",
              task.completedAt !== null && "line-through decoration-muted-foreground",
            )}
            type="button"
            onClick={() => onOpenDetails(task.id)}
          >
            {task.title}
          </button>

          {task.tags.length > 0 ? (
            <span className="hidden shrink-0 gap-1 sm:inline-flex">
              {task.tags.map((tag) => (
                <span
                  className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  key={tag.id}
                >
                  #{tag.name}
                </span>
              ))}
            </span>
          ) : null}
          {task.pinned ? (
            <PinIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Закреплено" />
          ) : null}
          {task.priority !== "none" ? (
            <FlagIcon
              className={cn("size-3.5 shrink-0 fill-current", PRIORITY_CLASS[task.priority])}
              aria-label="Приоритет"
            />
          ) : null}
          {task.rrule !== null ? (
            <RepeatIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label={rruleValueLabel(task.rrule)}
            />
          ) : null}
          {dueLabel ? (
            <span
              className={cn(
                "shrink-0 text-xs",
                overdue ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              {dueLabel}
            </span>
          ) : null}
          <button
            className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
            title="Подзадачи"
            type="button"
            onClick={() => setExpanded((value) => !value)}
          >
            {task.subtasks.length > 0 ? `${doneCount}/${task.subtasks.length}` : "+"}
          </button>
          {task.trashedAt ? (
            <button
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
              title="Восстановить"
              type="button"
              onClick={() => void restoreFromTrash()}
            >
              <RotateCcwIcon className="size-3.5" />
            </button>
          ) : (
            <button
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
              title="Удалить"
              type="button"
              onClick={() => void remove()}
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="subtasks"
              initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <SubtasksBlock task={task} />
            </motion.div>
          ) : null}
        </AnimatePresence>
        {error ? <p className="px-2 pb-1 text-xs text-destructive">{error}</p> : null}
      </motion.div>
    </li>
  );
}
