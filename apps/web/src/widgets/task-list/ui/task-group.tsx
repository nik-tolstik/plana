import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDownIcon } from "lucide-react";
import { AnimatedListItem, staggerDelayMs } from "@/shared/ui";
import type { TaskGroup } from "../model/grouping";
import type { TaskEditingState } from "../model/editing";
import type { TaskDragProps } from "../model/use-drag-reorder";
import { TaskRow } from "./task-row";

interface TaskGroupBlockProps {
  group: TaskGroup;
  today: string;
  onOpenDetails: (taskId: string) => void;
  dnd?: TaskDragProps;
  editing?: TaskEditingState | null;
  onEditingChange?: (editing: TaskEditingState | null) => void;
}

/** Сворачиваемая группа задач (дата или секция). */
export function TaskGroupBlock({
  group,
  today,
  onOpenDetails,
  dnd,
  editing,
  onEditingChange,
}: TaskGroupBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatedListItem delayMs={staggerDelayMs(0)}>
      <section>
        <button
          className="flex cursor-pointer items-center gap-1 rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
        >
          <motion.span
            aria-hidden
            className="flex items-center"
            animate={{ rotate: collapsed ? -90 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <ChevronDownIcon className="size-4" />
          </motion.span>
          <span className="font-medium">{group.title}</span>
          <span className="text-xs">{group.tasks.length}</span>
        </button>
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.ul
              key="group-tasks"
              initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              {group.tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onOpenDetails={onOpenDetails}
                  dnd={dnd}
                  delayMs={staggerDelayMs(index)}
                  editing={editing}
                  onEditingChange={onEditingChange}
                />
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </section>
    </AnimatedListItem>
  );
}
