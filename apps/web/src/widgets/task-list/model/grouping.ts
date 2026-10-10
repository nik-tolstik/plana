import { addDays, compareDays } from "@plana/shared";
import type { SectionDto, TaskDto } from "@plana/shared";

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

/** Группировка по секциям списка; задачи без секции — последняя группа. */
export function groupBySections(tasks: TaskDto[], sections: SectionDto[]): TaskGroup[] {
  const groups: TaskGroup[] = sections.map((section) => ({
    key: section.id,
    title: section.name,
    tasks: [],
  }));
  const noSection: TaskDto[] = [];
  const byId = new Map(groups.map((group) => [group.key, group]));
  for (const task of tasks) {
    if (task.sectionId && byId.has(task.sectionId)) {
      byId.get(task.sectionId)!.tasks.push(task);
    } else {
      noSection.push(task);
    }
  }
  if (noSection.length) groups.push({ key: "no-section", title: "Без секции", tasks: noSection });
  return groups.filter((group) => group.tasks.length > 0);
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
