import type { TaskGroup } from "../model/grouping";
import type { TaskDragProps } from "../model/use-drag-reorder";
import { TaskGroupBlock } from "./task-group";

interface TaskListViewProps {
  groups: TaskGroup[];
  today: string;
  onOpenDetails: (taskId: string) => void;
  dnd?: TaskDragProps;
}

/** Отображение задач группами; пустое состояние остаётся на странице. */
export function TaskListView({ groups, today, onOpenDetails, dnd }: TaskListViewProps) {
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
          onOpenDetails={onOpenDetails}
          dnd={dnd}
        />
      ))}
    </div>
  );
}
