import type { HabitType } from "@plana/shared";

/** Русские подписи типов привычки. */
export const HABIT_TYPE_LABELS_RU: Record<HabitType, string> = {
  check: "Чекбокс",
  number: "Число",
};

/** Русские сокращения дней недели привычки; бит 0 = понедельник. */
export const HABIT_WEEKDAY_SHORT_RU = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

/** Подпись расписания: «каждый день» или «пн, ср, пт». */
export function habitScheduleLabel(daysOfWeek: number): string {
  if (daysOfWeek === 127) return "каждый день";
  const days: string[] = [];
  for (let bit = 0; bit < 7; bit += 1) {
    if (((daysOfWeek >> bit) & 1) === 1) days.push(HABIT_WEEKDAY_SHORT_RU[bit]!);
  }
  return days.length === 0 ? "нет дней" : days.join(", ");
}
