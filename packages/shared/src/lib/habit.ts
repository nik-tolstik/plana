import { addDays, compareDays, dayOfWeek } from "./date-day.js";
import type { HabitWithEntriesDto } from "../schemas/habit.js";

/** Запланирован ли день: daysOfWeek — маска, бит 0 = понедельник. */
export function isScheduledOn(daysOfWeek: number, day: string): boolean {
  return ((daysOfWeek >> dayOfWeek(day)) & 1) === 1;
}

/** День закрыт: check — любое value > 0; number — value >= targetValue. */
export function isDayDone(
  habit: Pick<HabitWithEntriesDto, "type" | "targetValue">,
  value: number,
): boolean {
  if (habit.type === "number") {
    return value >= (habit.targetValue ?? 1);
  }
  return value > 0;
}

export interface HabitStreaks {
  /** Подряд закрытых запланированных дней до сегодня (незакрытый сегодня не ломает). */
  current: number;
  /** Лучший стрик в окне данных (60 дней). */
  best: number;
  /** Всего закрытых запланированных дней в окне. */
  total: number;
}

/**
 * Стрики по вхождениям окна (GET /v1/habits отдаёт 60 дней). Незапланированные
 * дни пропускаются и не ломают серию; сегодняшний незакрытый день не считается
 * провалом — серия считается со вчерашнего.
 */
export function habitStreaks(habit: HabitWithEntriesDto, today: string): HabitStreaks {
  const byDate = new Map(habit.entries.map((entry) => [entry.date, entry.value] as const));
  let first = today;
  for (const date of byDate.keys()) {
    if (compareDays(date, first) < 0) first = date;
  }

  let best = 0;
  let run = 0;
  let total = 0;
  for (let day = first; compareDays(day, today) <= 0; day = addDays(day, 1)) {
    if (!isScheduledOn(habit.daysOfWeek, day)) continue;
    if (isDayDone(habit, byDate.get(day) ?? 0)) {
      run += 1;
      total += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  let day = today;
  const todayValue = byDate.get(today) ?? 0;
  if (isScheduledOn(habit.daysOfWeek, today) && !isDayDone(habit, todayValue)) {
    day = addDays(today, -1);
  }
  for (; compareDays(day, first) >= 0; day = addDays(day, -1)) {
    if (!isScheduledOn(habit.daysOfWeek, day)) continue;
    if (isDayDone(habit, byDate.get(day) ?? 0)) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, best, total };
}

/** Подпись расписания: «каждый день» или «пн, ср, пт». */
export const HABIT_WEEKDAY_SHORT_RU = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

export function habitScheduleLabel(daysOfWeek: number): string {
  if (daysOfWeek === 127) return "каждый день";
  const days: string[] = [];
  for (let bit = 0; bit < 7; bit += 1) {
    if (((daysOfWeek >> bit) & 1) === 1) days.push(HABIT_WEEKDAY_SHORT_RU[bit]!);
  }
  return days.length === 0 ? "нет дней" : days.join(", ");
}
