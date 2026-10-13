import { useMemo, useState } from "react";
import { addDays, todayInZone, type SmartListKey } from "@plana/shared";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { QuickAdd } from "@/features/quick-add";
import { PageFade, Skeleton } from "@/shared/ui";
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
  // Задачи с «Сегодня»/«Завтра» без явной даты получают дату страницы —
  // иначе они не попадают в выборку умного списка и «не добавляются».
  const defaultDueDate =
    smart === "today" ? today : smart === "tomorrow" ? addDays(today, 1) : undefined;
  const tasks = tasksQuery.data?.items ?? [];
  const groups = useMemo(() => {
    if (smart === "completed" || smart === "trash") {
      return tasks.length ? [{ key: smart, title: SMART_TITLES[smart], tasks }] : [];
    }
    return groupByDueDate(tasks, today);
  }, [tasks, smart, today]);
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  return (
    <div className="flex w-full items-start gap-6">
      <PageFade className="min-w-0 flex-1 flex-col gap-3">
        <header>
          <h1 className="mb-3 text-xl font-semibold">{SMART_TITLES[smart]}</h1>
        </header>

        {smart !== "completed" && smart !== "trash" ? (
          <QuickAdd defaultDueDate={defaultDueDate} />
        ) : null}

        {tasksQuery.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : null}
        {tasksQuery.isError ? (
          <p className="text-destructive">Не удалось загрузить задачи</p>
        ) : null}

        {/* Дата на «Сегодня»/«Завтра» задаётся страницей — чип даты в строках избыточен. */}
        <TaskListView
          groups={groups}
          today={today}
          hideDateChip={smart === "today" || smart === "tomorrow"}
          onOpenDetails={setDetailsTaskId}
        />

        {!tasksQuery.isPending && tasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {smart === "trash" ? "Корзина пуста" : "Задач нет — добавьте первую выше"}
          </p>
        ) : null}
      </PageFade>

      {/* Панель сама проигрывает закрытие и размонтируется (см. TaskDetails). */}
      {detailsTask ? (
        <TaskDetails
          key={detailsTask.id}
          task={detailsTask}
          onClose={() => setDetailsTaskId(null)}
        />
      ) : null}
    </div>
  );
}
