import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import type { HabitWithEntriesDto } from "@plana/shared";
import { useDeleteHabit, useUpdateHabit } from "@/features/habit-manage";
import { AnimatedListItem, staggerDelayMs } from "@/shared/ui";
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
  const prefersReducedMotion = useReducedMotion();

  const active = habits.filter((habit) => habit.archivedAt === null);
  const archived = habits.filter((habit) => habit.archivedAt !== null);
  const isCurrentMonth =
    cursor.year === monthOf(today).year && cursor.month === monthOf(today).month;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          type="button"
          aria-label="Предыдущий месяц"
          onClick={() => setCursor(shiftMonth(cursor, -1))}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="min-w-32 text-center text-sm font-medium">{monthTitle(cursor)}</span>
        <button
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          disabled={isCurrentMonth}
          type="button"
          aria-label="Следующий месяц"
          onClick={() => setCursor(shiftMonth(cursor, 1))}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      {active.map((habit, index) => (
        <AnimatedListItem delayMs={staggerDelayMs(index)} key={habit.id}>
          <HabitCard cursor={cursor} habit={habit} today={today} />
        </AnimatedListItem>
      ))}

      {archived.length > 0 ? (
        <section className="rounded-xl border border-border">
          <button
            className="flex w-full cursor-pointer items-center gap-1 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            type="button"
            onClick={() => setShowArchived((value) => !value)}
          >
            <motion.span
              aria-hidden
              className="flex items-center"
              animate={{ rotate: showArchived ? 0 : -90 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <ChevronDownIcon className="size-4" />
            </motion.span>
            <ArchiveIcon className="size-4" aria-hidden="true" />
            <span className="font-medium">Архив</span>
            <span className="text-xs">{archived.length}</span>
          </button>
          <AnimatePresence initial={false}>
            {showArchived ? (
              <motion.div
                key="archived"
                initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1 px-3 pb-3">
                  {archived.map((habit) => (
                    <div className="flex items-center gap-2 text-sm" key={habit.id}>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {habit.name}
                      </span>
                      <button
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground disabled:opacity-50"
                        disabled={update.isPending}
                        title="Восстановить"
                        type="button"
                        onClick={() =>
                          void update.mutateAsync({ habitId: habit.id, archived: false })
                        }
                      >
                        <RotateCcwIcon className="size-4" />
                      </button>
                      <button
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-destructive disabled:opacity-50"
                        disabled={remove.isPending}
                        title="Удалить навсегда"
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Удалить «${habit.name}» со всей историей?`)) {
                            void remove.mutateAsync(habit.id);
                          }
                        }}
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      ) : null}
    </div>
  );
}
