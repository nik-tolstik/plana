import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { XIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import type { PatchTagDto } from "@plana/shared";
import { todayInZone } from "@plana/shared";
import { useTagsQuery } from "@/entities/tag";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { useDeleteTag, useUpdateTag } from "@/features/tag-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { EntityMarker, EntityStylePopover, PageFade, Skeleton } from "@/shared/ui";
import { TaskDetails } from "@/widgets/task-details";
import { groupByDueDate, TaskListView } from "@/widgets/task-list";

/** Страница тега: задачи с этим тегом, настройки (имя/цвет/иконка) и удаление. */
export function TagPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const tagsQuery = useTagsQuery();
  const tasksQuery = useTasksQuery(tagId ? { tagId } : { tagId: "" }, {
    enabled: tagId !== undefined,
  });
  const timezone = useUserTimezone();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tag = tagsQuery.data?.find((candidate) => candidate.id === tagId);

  const today = todayInZone(new Date(), timezone);
  const tasks = tasksQuery.data?.items ?? [];
  const groups = useMemo(() => groupByDueDate(tasks, today), [tasks, today]);
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  async function applyStyle(input: PatchTagDto) {
    if (!tagId) return;
    try {
      await updateTag.mutateAsync({ tagId, ...input });
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function remove() {
    if (!tagId) return;
    if (!window.confirm(`Удалить тег «${tag?.name ?? ""}»? Он снимется со всех задач.`)) {
      return;
    }
    try {
      await deleteTag.mutateAsync(tagId);
      navigate("/");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

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
          {tag ? (
            <span className="flex gap-1">
              <EntityStylePopover
                title={`Настройки тега «${tag.name}»`}
                style={{ name: tag.name, color: tag.color, icon: tag.icon }}
                onChange={(patch) => void applyStyle(patch)}
              />
              <button
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
                title="Удалить тег"
                type="button"
                onClick={() => void remove()}
              >
                <XIcon className="size-4" />
              </button>
            </span>
          ) : null}
        </header>

        {error ? <p className="text-destructive">{error}</p> : null}

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
