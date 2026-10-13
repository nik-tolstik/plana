import { ArchiveIcon, FlameIcon, MinusIcon, PlusIcon } from "lucide-react";
import { habitScheduleLabel, habitStreaks, type HabitWithEntriesDto } from "@plana/shared";
import { useDeleteHabitEntry, useSetHabitEntry, useUpdateHabit } from "@/features/habit-manage";
import { cn } from "@/shared/lib/cn";
import { Button, Checkbox } from "@/shared/ui";
import { HabitCalendar } from "./habit-calendar";
import { ENTITY_COLORS } from "@/shared/ui";
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
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: ENTITY_COLORS[habit.color] }}
          aria-hidden="true"
        />
        <h2 className="text-base font-semibold">{habit.name}</h2>
        <span className="text-xs text-muted-foreground">
          {habitScheduleLabel(habit.daysOfWeek)}
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-orange-500"
          title={`Лучший стрик: ${streaks.best}`}
        >
          <FlameIcon className="size-4" aria-hidden="true" /> {streaks.current}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          title="В архив"
          onClick={archive}
          aria-label="В архив"
        >
          <ArchiveIcon className="size-4" />
        </Button>
      </header>

      <div>
        {habit.type === "check" ? (
          <Checkbox
            size="lg"
            checked={todayDone}
            disabled={pending}
            onCheckedChange={() => toggleDate(today, todayValue, todayDone)}
            aria-label={todayDone ? "Снять отметку за сегодня" : "Отметить сегодня"}
          />
        ) : (
          <div className="inline-flex items-center gap-2">
            <Button
              variant="field"
              size="icon-sm"
              disabled={pending || todayValue === 0}
              onClick={() => stepToday(-1)}
              aria-label="Уменьшить"
            >
              <MinusIcon className="size-4" />
            </Button>
            <span
              className={cn(
                "min-w-12 text-center text-sm font-medium tabular-nums",
                todayDone ? "text-success" : "text-foreground",
              )}
            >
              {todayValue}/{habit.targetValue}
            </span>
            <Button
              variant="field"
              size="icon-sm"
              disabled={pending || todayValue >= (habit.targetValue ?? 1) * 2}
              onClick={() => stepToday(1)}
              aria-label="Увеличить"
            >
              <PlusIcon className="size-4" />
            </Button>
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
