import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { todayInZone } from "@plana/shared";
import { useSectionsQuery, useSidebarQuery } from "@/entities/list";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { useCreateSection } from "@/features/structure-manage";
import { QuickAdd } from "@/features/quick-add";
import { TaskDetails } from "@/widgets/task-details";
import { groupBySections, TaskListView } from "@/widgets/task-list";

export function ListPage() {
  const { listId } = useParams<{ listId: string }>();
  const sidebarQuery = useSidebarQuery();
  const sectionsQuery = useSectionsQuery(listId);
  const tasksQuery = useTasksQuery(listId ? { listId } : { smart: "all" });
  const timezone = useUserTimezone();
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const createSection = useCreateSection(listId ?? "");

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
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  if (sidebar && !list) {
    return (
      <div className="page-message">
        <h1>Список не найден</h1>
        <p>Возможно, он удалён. </p>
        <Link to="/">Вернуться на главную</Link>
      </div>
    );
  }

  return (
    <div className="page-columns">
      <div className="page-main">
        <header className="page-header">
          <h1>
            {list?.emoji ? `${list.emoji} ` : ""}
            {list?.name ?? "…"}
          </h1>
        </header>

        <QuickAdd defaultListId={listId} />

        {tasksQuery.isPending && <p className="page-status">Загрузка…</p>}
        {tasksQuery.isError && <p className="page-error">Не удалось загрузить задачи</p>}

        <TaskListView groups={groups} today={today} onOpenDetails={setDetailsTaskId} />

        {addingSection ? (
          <form
            className="add-form"
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
            <input
              aria-label="Название секции"
              name="name"
              placeholder="Название секции"
              autoFocus
            />
            <button type="submit">✓</button>
            <button onClick={() => setAddingSection(false)} type="button">
              ✕
            </button>
          </form>
        ) : (
          <button className="add-btn" type="button" onClick={() => setAddingSection(true)}>
            + Секция
          </button>
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
