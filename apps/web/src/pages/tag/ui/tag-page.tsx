import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Link, useParams } from "react-router";
import { todayInZone } from "@plana/shared";
import { useTagsQuery } from "@/entities/tag";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { EntityMarker, PageFade, Skeleton } from "@/shared/ui";
import { TaskDetails } from "@/widgets/task-details";
import { groupByDueDate, TaskListView } from "@/widgets/task-list";

/** Страница тега: задачи с этим тегом. Настройки и удаление — из строки в сайдбаре. */
export function TagPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const tagsQuery = useTagsQuery();
  const tasksQuery = useTasksQuery(tagId ? { tagId } : { tagId: "" }, {
    enabled: tagId !== undefined,
  });
  const timezone = useUserTimezone();

  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);

  const tag = tagsQuery.data?.find((candidate) => candidate.id === tagId);

  const today = todayInZone(new Date(), timezone);
  const tasks = tasksQuery.data?.items ?? [];
  const groups = useMemo(() => groupByDueDate(tasks, today), [tasks, today]);
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  if (tagsQuery.data && !tag) {
    return (
      <PageFade>
        <h1 className="mb-3 text-xl font-semibold">Тег не найден</h1>
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
        <header className="flex items-center gap-2">
          {tag ? <EntityMarker icon={tag.icon} color={tag.color} /> : null}
          <h1 className="text-xl font-semibold">{tag?.name ?? "…"}</h1>
        </header>

        {tasksQuery.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : null}
        {tasksQuery.isError ? (
          <p className="text-destructive">Не удалось загрузить задачи</p>
        ) : null}

        <TaskListView groups={groups} today={today} onOpenDetails={setDetailsTaskId} />

        {!tasksQuery.isPending && tasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Задач с этим тегом нет</p>
        ) : null}
      </PageFade>

      <AnimatePresence>
        {detailsTask ? (
          <TaskDetails
            key={detailsTask.id}
            task={detailsTask}
            onClose={() => setDetailsTaskId(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
