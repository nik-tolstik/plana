import { useEffect, useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useSearchParams } from "react-router";
import { todayInZone } from "@plana/shared";
import { useTasksQuery } from "@/entities/task";
import { useUserTimezone } from "@/entities/user";
import { Input, PageFade, Skeleton } from "@/shared/ui";
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
    <div className="flex w-full items-start gap-6">
      <PageFade className="min-w-0 flex-1 flex-col gap-3">
        <header>
          <h1 className="mb-3 text-xl font-semibold">Поиск</h1>
        </header>

        <Input
          aria-label="Поиск задач"
          autoFocus
          prefix={<SearchIcon className="size-4" />}
          placeholder="Искать по заголовку и описанию…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        {enabled && tasksQuery.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : null}
        {enabled && tasksQuery.isError ? (
          <p className="text-destructive">Не удалось выполнить поиск</p>
        ) : null}

        <TaskListView
          groups={groups}
          today={today}
          activeTaskId={detailsTaskId}
          onOpenDetails={setDetailsTaskId}
        />

        {enabled && !tasksQuery.isPending && tasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Ничего не найдено</p>
        ) : null}
        {!enabled ? (
          <p className="py-8 text-center text-muted-foreground">
            Введите запрос — поиск по заголовку и описанию
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
