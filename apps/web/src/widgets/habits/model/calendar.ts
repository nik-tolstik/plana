import { compareDays, dayOfWeek, isDayDone, isScheduledOn } from "@plana/shared";
import type { HabitWithEntriesDto } from "@plana/shared";

export interface HabitCalendarDay {
  date: string;
  /** День входит в расписание (маска daysOfWeek). */
  scheduled: boolean;
  /** Цель дня достигнута (check: value > 0; number: value >= target). */
  done: boolean;
  /** Есть запись, но цель не достигнута (числовые). */
  partial: boolean;
  state: "past" | "today" | "future";
}

export interface MonthCursor {
  /** Год, месяц 0-based (как у Date). */
  year: number;
  month: number;
}

export function monthOf(day: string): MonthCursor {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 };
}

export function shiftMonth(cursor: MonthCursor, amount: number): MonthCursor {
  const total = cursor.year * 12 + (cursor.month + amount);
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function monthTitle(cursor: MonthCursor): string {
  return `${MONTHS_RU[cursor.month]} ${cursor.year}`;
}

/**
 * Ячейки сетки месяца (неделя с понедельника): null — ведущие пустые
 * предыдущего месяца, дальше дни месяца.
 */
export function calendarCells(cursor: MonthCursor): Array<string | null> {
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const first = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01`;
  const lead = dayOfWeek(first);
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  return cells;
}

/** Состояние каждого дня месяца для привычки. */
export function calendarDays(
  habit: HabitWithEntriesDto,
  cursor: MonthCursor,
  today: string,
): HabitCalendarDay[] {
  const byDate = new Map(habit.entries.map((entry) => [entry.date, entry.value] as const));
  return calendarCells(cursor)
    .filter((cell): cell is string => cell !== null)
    .map((date) => {
      const value = byDate.get(date) ?? 0;
      return {
        date,
        scheduled: isScheduledOn(habit.daysOfWeek, date),
        done: value !== 0 && isDayDone(habit, value),
        partial: value !== 0 && !isDayDone(habit, value),
        state: compareDays(date, today) < 0 ? "past" : date === today ? "today" : "future",
      };
    });
}

export const WEEKDAY_HEADERS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;
