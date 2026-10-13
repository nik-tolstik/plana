import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { todayInZone } from "@plana/shared";
import { useSidebarQuery } from "@/entities/list";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { QuickAdd } from "@/features/quick-add";
import { PageFade, Skeleton } from "@/shared/ui";
import { TaskDetails } from "@/widgets/task-details";
import { TaskListView, useTaskDragReorder } from "@/widgets/task-list";
import {
  ListDisplaySettingsButton,
  groupByDueDate,
  groupByPriority,
  sortTasksFor,
  type ListDisplaySettings,
  loadListDisplay,
  saveListDisplay,
} from "@/widgets/task-list";

export function ListPage() {
  const { listId } = useParams<{ listId: string }>();
  const sidebarQuery = useSidebarQuery();
  const tasksQuery = useTasksQuery(listId ? { listId } : { smart: "all" });
  const timezone = useUserTimezone();
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [display, setDisplay] = useState<ListDisplaySettings>(() =>
    loadListDisplay(listId ?? "none"),
  );

  const sidebar = sidebarQuery.data;
  const list = useMemo(() => {
    if (!sidebar || !listId) return undefined;
    return [
      sidebar.inbox,
      ...sidebar.rootLists,
      ...sidebar.folders.flatMap((folder) => folder.lists),
    ].find((candidate) => candidate.id === listId);
  }, [sidebar, listId]);

  const today = todayInZone(new Date(), timezone);
  const tasks = tasksQuery.data?.items ?? [];

  // Группировка и порядок задач — настройки страницы списка.
  const groups = useMemo(() => {
    if (tasks.length === 0) return [];
    const grouped =
      display.group === "date"
        ? groupByDueDate(tasks, today)
        : display.group === "priority"
          ? groupByPriority(tasks)
          : [{ key: "all", title: "", tasks }];
    return grouped.map((group) => ({ ...group, tasks: sortTasksFor(group.tasks, display.sort) }));
  }, [tasks, today, display]);

  // Перетаскивание доступно только при ручном порядке: имена групп и явные
  // сортировки конфликтуют с позиционным reorder.
  const manualOrder = display.group === "none" && display.sort === "manual";
  const dnd = useTaskDragReorder({ enabled: manualOrder && listId !== undefined, tasks });
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  function changeDisplay(next: ListDisplaySettings) {
    setDisplay(next);
    if (listId !== undefined) {
      saveListDisplay(listId, next);
    }
  }

  if (sidebar && !list) {
    return (
      <PageFade>
        <h1 className="mb-3 text-xl font-semibold">Список не найден</h1>
        <p className="mb-4 text-muted-foreground">Возможно, он удалён.</p>
        <Link className="text-primary-text hover:underline" to="/">
          Вернуться на главную
        </Link>
      </PageFade>
    );
  }

  return (
    <div className="flex w-full items-start gap-6">
      <PageFade className="min-w-0 flex-1 flex-col gap-3">
        <header className="mb-3 flex items-center gap-1">
          <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">
            {list?.emoji ? `${list.emoji} ` : ""}
            {list?.name ?? "…"}
          </h1>
          <ListDisplaySettingsButton settings={display} onChange={changeDisplay} />
        </header>

        <QuickAdd defaultListId={listId} />

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

        <TaskListView groups={groups} today={today} onOpenDetails={setDetailsTaskId} dnd={dnd} />

        {!tasksQuery.isPending && tasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">В этом списке пока нет задач</p>
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
