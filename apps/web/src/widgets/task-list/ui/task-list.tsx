import { useState } from "react";

import type { TaskGroup } from "../model/grouping";
import type { TaskEditingState } from "../model/editing";
import type { TaskDragProps } from "../model/use-drag-reorder";
import { TaskGroupBlock } from "./task-group";

interface TaskListViewProps {
  groups: TaskGroup[];
  today: string;
  /** Страница задаёт дату («Сегодня»/«Завтра») — чип даты в строках скрыт. */
  hideDateChip?: boolean;
  onOpenDetails: (taskId: string) => void;
  dnd?: TaskDragProps;
}

/** Отображение задач группами; пустое состояние остаётся на странице. */
export function TaskListView({
  groups,
  today,
  hideDateChip = false,
  onOpenDetails,
  dnd,
}: TaskListViewProps) {
  // Инлайн-ввод один на весь список: одновременно правится одна строка.
  const [editing, setEditing] = useState<TaskEditingState | null>(null);

  if (groups.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <TaskGroupBlock
          group={group}
          key={group.key}
          today={today}
          hideDateChip={hideDateChip}
          onOpenDetails={onOpenDetails}
          dnd={dnd}
          editing={editing}
          onEditingChange={setEditing}
        />
      ))}
    </div>
  );
}
