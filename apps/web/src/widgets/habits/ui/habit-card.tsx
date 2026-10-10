import { habitScheduleLabel, habitStreaks, type HabitWithEntriesDto } from "@plana/shared";
import { useDeleteHabitEntry, useSetHabitEntry, useUpdateHabit } from "@/features/habit-manage";
import { HabitCalendar } from "./habit-calendar";
import { LIST_DOT_COLORS } from "@/widgets/sidebar/model/colors";
import type { MonthCursor } from "../model/calendar";

interface HabitCardProps {
  habit: HabitWithEntriesDto;
  cursor: MonthCursor;
  today: string;
}

/** Карточка привычки: чек-ин сегодня, стрик, календарь месяца, архив. */
export function HabitCard({ habit, cursor, today }: HabitCardProps) {
  const setEntry = useSetHabitEntry();
  const deleteEntry = useDeleteHabitEntry();
  const update = useUpdateHabit();
  const pending = setEntry.isPending || deleteEntry.isPending || update.isPending;

  const streaks = habitStreaks(habit, today);
  const todayValue = habit.entries.find((entry) => entry.date === today)?.value ?? 0;
  const todayDone =
    habit.type === "number" ? todayValue >= (habit.targetValue ?? 1) : todayValue > 0;

  function toggleDate(date: string, value: number, done: boolean) {
    // Закрытый день — снять отметку; открытый — чекбокс 1, число — цель дня.
    if (done) {
      void deleteEntry.mutateAsync({ habitId: habit.id, date });
      return;
    }
    const next = habit.type === "number" ? (habit.targetValue ?? 1) : 1;
    void setEntry.mutateAsync({ habitId: habit.id, date, value: next });
  }

  function stepToday(delta: 1 | -1) {
    const next = todayValue + delta;
    if (next <= 0) {
      void deleteEntry.mutateAsync({ habitId: habit.id, date: today });
      return;
    }
    const max = (habit.targetValue ?? 1) * 2;
    void setEntry.mutateAsync({
      habitId: habit.id,
      date: today,
      value: Math.min(next, max),
    });
  }

  function archive() {
    void update.mutateAsync({ habitId: habit.id, archived: true });
  }

  return (
    <article className="habit-card">
      <header className="habit-header">
        <span
          className="habit-dot"
          style={{ background: LIST_DOT_COLORS[habit.color] }}
          aria-hidden="true"
        />
        <h2 className="habit-name">{habit.name}</h2>
        <span className="habit-meta">{habitScheduleLabel(habit.daysOfWeek)}</span>
        <span className="habit-streak" title={`Лучший стрик: ${streaks.best}`}>
          🔥 {streaks.current}
        </span>
        <button
          className="icon-btn"
          disabled={pending}
          title="В архив"
          type="button"
          onClick={archive}
        >
          🗃
        </button>
      </header>

      <div className="habit-today">
        {habit.type === "check" ? (
          <button
            aria-label={todayDone ? "Снять отметку за сегодня" : "Отметить сегодня"}
            className={`habit-check${todayDone ? " checked" : ""}`}
            disabled={pending}
            type="button"
            onClick={() => toggleDate(today, todayValue, todayDone)}
          />
        ) : (
          <div className="habit-counter">
            <button
              aria-label="Уменьшить"
              disabled={pending || todayValue === 0}
              type="button"
              onClick={() => stepToday(-1)}
            >
              −
            </button>
            <span className={todayDone ? "done" : ""}>
              {todayValue}/{habit.targetValue}
            </span>
            <button
              aria-label="Увеличить"
              disabled={pending || todayValue >= (habit.targetValue ?? 1) * 2}
              type="button"
              onClick={() => stepToday(1)}
            >
              +
            </button>
          </div>
        )}
      </div>

      <HabitCalendar
        cursor={cursor}
        habit={habit}
        onToggleDay={(date) => {
          const value = habit.entries.find((entry) => entry.date === date)?.value ?? 0;
          const done = habit.type === "number" ? value >= (habit.targetValue ?? 1) : value > 0;
          toggleDate(date, value, done);
        }}
        pending={pending}
        today={today}
      />
    </article>
  );
}
