import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { todayInZone } from "@plana/shared";
import { useTagsQuery } from "@/entities/tag";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { useDeleteTag, useUpdateTag } from "@/features/tag-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { TaskDetails } from "@/widgets/task-details";
import { groupByDueDate, TaskListView } from "@/widgets/task-list";

/** Страница тега: задачи с этим тегом, переименование и удаление тега. */
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
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tag = tagsQuery.data?.find((candidate) => candidate.id === tagId);

  const today = todayInZone(new Date(), timezone);
  const tasks = tasksQuery.data?.items ?? [];
  const groups = useMemo(() => groupByDueDate(tasks, today), [tasks, today]);
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  async function rename() {
    if (!tagId || !tag) return;
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed === tag.name) {
      setRenaming(false);
      return;
    }
    try {
      await updateTag.mutateAsync({ tagId, name: trimmed });
      setRenaming(false);
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
      <div className="page-message">
        <h1>Тег не найден</h1>
        <p>Возможно, он удалён. </p>
        <Link to="/">Вернуться на главную</Link>
      </div>
    );
  }

  return (
    <div className="page-columns">
      <div className="page-main">
        <header className="page-header tag-header">
          <h1>#{tag?.name ?? "…"}</h1>
          <div className="tag-actions">
            {tag && (
              <>
                <button
                  className="icon-btn"
                  title="Переименовать"
                  type="button"
                  onClick={() => {
                    setName(tag.name);
                    setRenaming(true);
                  }}
                >
                  ✎
                </button>
                <button
                  className="icon-btn"
                  title="Удалить тег"
                  type="button"
                  onClick={() => void remove()}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </header>

        {renaming && (
          <form
            className="add-form"
            onSubmit={(event) => {
              event.preventDefault();
              void rename();
            }}
          >
            <input
              aria-label="Новое имя тега"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setRenaming(false);
              }}
            />
            <button disabled={updateTag.isPending} type="submit">
              ✓
            </button>
            <button onClick={() => setRenaming(false)} type="button">
              ✕
            </button>
          </form>
        )}
        {error && <p className="page-error">{error}</p>}

        {tasksQuery.isPending && <p className="page-status">Загрузка…</p>}
        {tasksQuery.isError && <p className="page-error">Не удалось загрузить задачи</p>}

        <TaskListView groups={groups} today={today} onOpenDetails={setDetailsTaskId} />

        {!tasksQuery.isPending && tasks.length === 0 && (
          <p className="tasks-empty">Задач с этим тегом нет</p>
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
