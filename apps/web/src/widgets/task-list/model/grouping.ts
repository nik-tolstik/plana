import { addDays, compareDays } from "@plana/shared";
import type { TaskDto, TaskPriority } from "@plana/shared";

export interface TaskGroup {
  key: string;
  title: string;
  tasks: TaskDto[];
}

function formatDayTitle(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  // Форматируем в UTC по частям самой строки — день недели соответствует дате при любом TZ клиента.
  const utc = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1));
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(utc);
}

/** Группировка по датам: Просрочено → Сегодня → Завтра → будущие дни → Без даты. */
export function groupByDueDate(tasks: TaskDto[], today: string): TaskGroup[] {
  const overdue: TaskDto[] = [];
  const todayTasks: TaskDto[] = [];
  const tomorrow: TaskDto[] = [];
  const future = new Map<string, TaskDto[]>();
  const noDate: TaskDto[] = [];

  for (const task of tasks) {
    if (task.dueDate === null) {
      noDate.push(task);
      continue;
    }
    if (compareDays(task.dueDate, today) < 0) overdue.push(task);
    else if (task.dueDate === today) todayTasks.push(task);
    else if (task.dueDate === addDays(today, 1)) tomorrow.push(task);
    else {
      const bucket = future.get(task.dueDate) ?? [];
      bucket.push(task);
      future.set(task.dueDate, bucket);
    }
  }

  const groups: TaskGroup[] = [];
  if (overdue.length) groups.push({ key: "overdue", title: "Просрочено", tasks: overdue });
  if (todayTasks.length) groups.push({ key: "today", title: "Сегодня", tasks: todayTasks });
  if (tomorrow.length) groups.push({ key: "tomorrow", title: "Завтра", tasks: tomorrow });
  for (const day of [...future.keys()].sort()) {
    groups.push({ key: day, title: formatDayTitle(day), tasks: future.get(day) ?? [] });
  }
  if (noDate.length) groups.push({ key: "no-date", title: "Без даты", tasks: noDate });
  return groups;
}

const PRIORITY_GROUP_ORDER: TaskPriority[] = ["high", "medium", "low", "none"];
const PRIORITY_GROUP_TITLES: Record<TaskPriority, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
  none: "Без приоритета",
};

/** Группировка по приоритету: Высокий → Средний → Низкий → Без приоритета. */
export function groupByPriority(tasks: TaskDto[]): TaskGroup[] {
  const buckets = new Map<TaskPriority, TaskDto[]>(PRIORITY_GROUP_ORDER.map((p) => [p, []]));
  for (const task of tasks) {
    buckets.get(task.priority)?.push(task);
  }
  return PRIORITY_GROUP_ORDER.filter((priority) => (buckets.get(priority) ?? []).length > 0).map(
    (priority) => ({
      key: `priority-${priority}`,
      title: PRIORITY_GROUP_TITLES[priority],
      tasks: buckets.get(priority) ?? [],
    }),
  );
}

/** Вес приоритета для сортировки: выше приоритет — меньше вес. */
const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2, none: 3 };

/**
 * Порядок задач внутри списка/группы. «Вручную» — позиционный порядок
 * (как отдал сервер, перестановка drag-n-drop); остальные — явные ключи.
 */
export function sortTasksFor(
  tasks: TaskDto[],
  sort: "manual" | "date" | "priority" | "title",
): TaskDto[] {
  const copy = [...tasks];
  switch (sort) {
    case "manual":
      return copy;
    case "date":
      // Без даты — в конец; из двух дат раньше та, что меньше.
      return copy.sort((a, b) => {
        if (a.dueDate === null && b.dueDate === null) return 0;
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        const byDay = compareDays(a.dueDate, b.dueDate);
        if (byDay !== 0) return byDay;
        return (a.dueTime ?? "").localeCompare(b.dueTime ?? "");
      });
    case "priority":
      return copy.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }
}

/** Короткая подпись даты задачи для строки: «Сегодня», «12 окт» (+ время). */
export function taskDueLabel(task: TaskDto, today: string): string | null {
  if (task.dueDate === null) return null;
  const time = task.dueTime ? ` ${task.dueTime.slice(0, 5)}` : "";
  if (task.dueDate === today) return `Сегодня${time}`;
  if (task.dueDate === addDays(today, 1)) return `Завтра${time}`;
  const [year, month, day] = task.dueDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  const pattern =
    compareDays(task.dueDate, today) < 0
      ? { weekday: "short" as const, day: "numeric" as const, month: "short" as const }
      : { day: "numeric" as const, month: "short" as const };
  const label = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", ...pattern }).format(utc);
  return `${label}${time}`;
}
