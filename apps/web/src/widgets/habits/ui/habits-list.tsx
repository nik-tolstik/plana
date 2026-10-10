import { useState } from "react";
import type { HabitWithEntriesDto } from "@plana/shared";
import { useDeleteHabit, useUpdateHabit } from "@/features/habit-manage";
import { HabitCard } from "./habit-card";
import { monthOf, monthTitle, shiftMonth } from "../model/calendar";
import type { MonthCursor } from "../model/calendar";

interface HabitsListProps {
  habits: HabitWithEntriesDto[];
  today: string;
}

/** Активные привычки, переключатель месяца и свёрнутый архив. */
export function HabitsList({ habits, today }: HabitsListProps) {
  const update = useUpdateHabit();
  const remove = useDeleteHabit();
  const [cursor, setCursor] = useState<MonthCursor>(() => monthOf(today));
  const [showArchived, setShowArchived] = useState(false);

  const active = habits.filter((habit) => habit.archivedAt === null);
  const archived = habits.filter((habit) => habit.archivedAt !== null);

  return (
    <div className="habits-list">
      <div className="habit-month-nav">
        <button type="button" onClick={() => setCursor(shiftMonth(cursor, -1))}>
          ←
        </button>
        <span>{monthTitle(cursor)}</span>
        <button
          disabled={cursor.year === monthOf(today).year && cursor.month === monthOf(today).month}
          type="button"
          onClick={() => setCursor(shiftMonth(cursor, 1))}
        >
          →
        </button>
      </div>

      {active.map((habit) => (
        <HabitCard cursor={cursor} habit={habit} key={habit.id} today={today} />
      ))}

      {archived.length > 0 && (
        <section className="habits-archived">
          <button
            className="group-header"
            type="button"
            onClick={() => setShowArchived((value) => !value)}
          >
            <span className="group-arrow">{showArchived ? "▾" : "▸"}</span>
            <span className="group-title">Архив</span>
            <span className="group-count">{archived.length}</span>
          </button>
          {showArchived &&
            archived.map((habit) => (
              <div className="habits-archived-row" key={habit.id}>
                <span>{habit.name}</span>
                <button
                  disabled={update.isPending}
                  title="Восстановить"
                  type="button"
                  onClick={() => void update.mutateAsync({ habitId: habit.id, archived: false })}
                >
                  ↺
                </button>
                <button
                  disabled={remove.isPending}
                  title="Удалить навсегда"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Удалить «${habit.name}» со всей историей?`)) {
                      void remove.mutateAsync(habit.id);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
