import type { TaskGroup } from "../model/grouping";
import { TaskGroupBlock } from "./task-group";

interface TaskListViewProps {
  groups: TaskGroup[];
  today: string;
  onOpenDetails: (taskId: string) => void;
}

/** Отображение задач группами; пустое состояние остаётся на странице. */
export function TaskListView({ groups, today, onOpenDetails }: TaskListViewProps) {
  if (groups.length === 0) {
    return null;
  }
  return (
    <div className="task-groups">
      {groups.map((group) => (
        <TaskGroupBlock group={group} key={group.key} today={today} onOpenDetails={onOpenDetails} />
      ))}
    </div>
  );
}
