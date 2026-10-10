import { useState } from "react";
import type { TaskGroup } from "../model/grouping";
import { TaskRow } from "./task-row";

interface TaskGroupBlockProps {
  group: TaskGroup;
  today: string;
  onOpenDetails: (taskId: string) => void;
}

/** Сворачиваемая группа задач (дата или секция). */
export function TaskGroupBlock({ group, today, onOpenDetails }: TaskGroupBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="task-group">
      <button
        className="group-header"
        type="button"
        onClick={() => setCollapsed((value) => !value)}
      >
        <span className="group-arrow">{collapsed ? "▸" : "▾"}</span>
        <span className="group-title">{group.title}</span>
        <span className="group-count">{group.tasks.length}</span>
      </button>
      {!collapsed && (
        <ul className="task-list">
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} today={today} onOpenDetails={onOpenDetails} />
          ))}
        </ul>
      )}
    </section>
  );
}
