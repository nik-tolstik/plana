import type { HabitWithEntriesDto } from "@plana/shared";
import { cn } from "@/shared/lib/cn";
import { WEEKDAY_HEADERS, calendarCells, calendarDays } from "../model/calendar";
import type { MonthCursor } from "../model/calendar";

interface HabitCalendarProps {
  habit: HabitWithEntriesDto;
  cursor: MonthCursor;
  today: string;
  /** Клик по прошедшему/сегодняшнему дню. */
  onToggleDay: (date: string) => void;
  pending: boolean;
}

/** Мини-календарь месяца: закрытые дни залиты, пропуски пустые, будущее отключено. */
export function HabitCalendar({ habit, cursor, today, onToggleDay, pending }: HabitCalendarProps) {
  const lead = calendarCells(cursor).filter((cell) => cell === null).length;
  const days = calendarDays(habit, cursor, today);

  return (
    <div
      className="grid grid-cols-7 gap-1 text-center"
      role="group"
      aria-label="Календарь привычки"
    >
      {WEEKDAY_HEADERS.map((title) => (
        <span className="text-xs text-muted-foreground" key={title}>
          {title}
        </span>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <span key={`lead-${i}`} />
      ))}
      {days.map((day) => {
        const clickable = day.state !== "future" && !pending;
        return (
          <button
            className={cn(
              "flex h-9 cursor-pointer items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors",
              "focus-visible:ring-2 focus-visible:ring-control-focus/30 outline-none",
              day.done && "bg-success text-success-foreground hover:brightness-95",
              !day.done && day.partial && "text-success ring-1 ring-success hover:bg-surface-hover",
              !day.done && !day.partial && "hover:bg-surface-hover",
              !day.scheduled && "border border-dashed border-border",
              day.state === "today" && !day.done && "ring-1 ring-foreground/60",
              day.state === "future" && "pointer-events-none opacity-30",
              !clickable && !day.done && "opacity-60",
            )}
            disabled={!clickable}
            key={day.date}
            title={day.date}
            type="button"
            onClick={() => onToggleDay(day.date)}
          >
            {Number(day.date.slice(8, 10))}
          </button>
        );
      })}
    </div>
  );
}
