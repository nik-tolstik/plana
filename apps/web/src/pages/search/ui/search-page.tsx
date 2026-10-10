import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { todayInZone } from "@plana/shared";
import { useTasksQuery, useUserTimezone } from "@/entities/task";
import { TaskDetails } from "@/widgets/task-details";
import { groupByDueDate, TaskListView } from "@/widgets/task-list";

const DEBOUNCE_MS = 300;

/** Страница поиска: q по заголовку и описанию, результаты группами по датам. */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const timezone = useUserTimezone();
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);

  const urlQuery = searchParams.get("q") ?? "";
  const [text, setText] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);

  // Дебаунс ввода: запрос уходит через 300 мс после остановки печати.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const trimmed = debounced.trim();
  const enabled = trimmed.length > 0;
  const tasksQuery = useTasksQuery({ q: trimmed }, { enabled });

  useEffect(() => {
    // Ссылка поделиться/назад: отражаем запрос в URL без перезагрузки.
    const next = enabled ? `?q=${encodeURIComponent(trimmed)}` : "?";
    if (urlQuery !== trimmed) {
      setSearchParams(next === "?" ? {} : { q: trimmed }, { replace: true });
    }
  }, [trimmed, enabled, urlQuery, setSearchParams]);

  const today = todayInZone(new Date(), timezone);
  const tasks = enabled ? (tasksQuery.data?.items ?? []) : [];
  const groups = useMemo(() => groupByDueDate(tasks, today), [tasks, today]);
  const detailsTask = tasks.find((task) => task.id === detailsTaskId);

  return (
    <div className="page-columns">
      <div className="page-main">
        <header className="page-header">
          <h1>Поиск</h1>
        </header>

        <div className="search-box">
          <input
            aria-label="Поиск задач"
            autoFocus
            className="search-input"
            placeholder="Искать по заголовку и описанию…"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        {enabled && tasksQuery.isPending && <p className="page-status">Загрузка…</p>}
        {enabled && tasksQuery.isError && <p className="page-error">Не удалось выполнить поиск</p>}

        <TaskListView groups={groups} today={today} onOpenDetails={setDetailsTaskId} />

        {enabled && !tasksQuery.isPending && tasks.length === 0 && (
          <p className="tasks-empty">Ничего не найдено</p>
        )}
        {!enabled && <p className="tasks-empty">Введите запрос — поиск по заголовку и описанию</p>}
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
