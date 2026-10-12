import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import { todayInZone } from "@plana/shared";
import { useSectionsQuery, useSidebarQuery } from "@/entities/list";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { useCreateSection } from "@/features/structure-manage";
import { QuickAdd } from "@/features/quick-add";
import { Button, Input, PageFade, Skeleton } from "@/shared/ui";
import { TaskDetails } from "@/widgets/task-details";
import { groupBySections, TaskListView, useTaskDragReorder } from "@/widgets/task-list";

export function ListPage() {
  const { listId } = useParams<{ listId: string }>();
  const sidebarQuery = useSidebarQuery();
  const sectionsQuery = useSectionsQuery(listId);
  const tasksQuery = useTasksQuery(listId ? { listId } : { smart: "all" });
  const timezone = useUserTimezone();
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const createSection = useCreateSection(listId ?? "");
  const prefersReducedMotion = useReducedMotion();

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
  const groups = useMemo(
    () => groupBySections(tasks, sectionsQuery.data ?? []),
    [tasks, sectionsQuery.data],
  );
  // Перетаскивание доступно только на страницах списков.
  const dnd = useTaskDragReorder({ enabled: listId !== undefined, tasks });
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

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
        <header>
          <h1 className="mb-3 text-xl font-semibold">
            {list?.emoji ? `${list.emoji} ` : ""}
            {list?.name ?? "…"}
          </h1>
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

        <AnimatePresence initial={false}>
          {addingSection ? (
            <motion.form
              key="add-section"
              className="flex items-center gap-1"
              initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onSubmit={(event) => {
                event.preventDefault();
                const input = event.currentTarget.elements.namedItem(
                  "name",
                ) as HTMLInputElement | null;
                const name = input?.value.trim() ?? "";
                if (name.length === 0 || !input) return;
                void createSection.mutateAsync(name).then(() => {
                  input.value = "";
                });
              }}
            >
              <Input
                aria-label="Название секции"
                name="name"
                placeholder="Название секции"
                className="min-h-8"
                autoFocus
              />
              <button
                className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
                type="submit"
                title="Добавить"
              >
                <CheckIcon className="size-4" />
              </button>
              <button
                className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
                onClick={() => setAddingSection(false)}
                type="button"
                title="Отмена"
              >
                <XIcon className="size-4" />
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="btn-section"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground hover:text-foreground"
                onClick={() => setAddingSection(true)}
              >
                <PlusIcon /> Секция
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
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
