import { useMemo, useState } from "react";
import { todayInZone, type SmartListKey } from "@plana/shared";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { QuickAdd } from "@/features/quick-add";
import { TaskDetails } from "@/widgets/task-details";
import { groupByDueDate, TaskListView } from "@/widgets/task-list";

const SMART_TITLES: Record<SmartListKey, string> = {
  inbox: "Входящие",
  today: "Сегодня",
  tomorrow: "Завтра",
  next7: "Следующие 7 дней",
  all: "Все",
  completed: "Завершённые",
  trash: "Корзина",
};

interface SmartPageProps {
  smart: SmartListKey;
}

/** Страница умного списка: группировка по датам (кроме завершённых и корзины). */
export function SmartPage({ smart }: SmartPageProps) {
  const tasksQuery = useTasksQuery({ smart });
  const timezone = useUserTimezone();
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);

  const today = todayInZone(new Date(), timezone);
  const tasks = tasksQuery.data?.items ?? [];
  const groups = useMemo(() => {
    if (smart === "completed" || smart === "trash") {
      return tasks.length ? [{ key: smart, title: SMART_TITLES[smart], tasks }] : [];
    }
    return groupByDueDate(tasks, today);
  }, [tasks, smart, today]);
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  return (
    <div className="page-columns">
      <div className="page-main">
        <header className="page-header">
          <h1>{SMART_TITLES[smart]}</h1>
        </header>

        {smart !== "completed" && smart !== "trash" && <QuickAdd />}

        {tasksQuery.isPending && <p className="page-status">Загрузка…</p>}
        {tasksQuery.isError && <p className="page-error">Не удалось загрузить задачи</p>}

        <TaskListView groups={groups} today={today} onOpenDetails={setDetailsTaskId} />

        {!tasksQuery.isPending && tasks.length === 0 && (
          <p className="tasks-empty">
            {smart === "trash" ? "Корзина пуста" : "Задач нет — добавьте первую выше"}
          </p>
        )}
      </div>

      {detailsTask && (
        <TaskDetails
          key={detailsTask.id}
          task={detailsTask}
          onClose={() => setDetailsTaskId(null)}
        />
      )}
    </div>
  );
}
