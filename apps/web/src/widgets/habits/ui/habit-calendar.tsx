import type { HabitWithEntriesDto } from "@plana/shared";
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
    <div className="habit-calendar" aria-label="Календарь привычки">
      {WEEKDAY_HEADERS.map((title) => (
        <span className="habit-dow" key={title}>
          {title}
        </span>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <span key={`lead-${i}`} />
      ))}
      {days.map((day) => {
        const clickable = day.state !== "future" && !pending;
        const classes = [
          "habit-day",
          day.done ? "done" : "",
          day.partial ? "partial" : "",
          !day.scheduled ? "off" : "",
          day.state === "future" ? "future" : "",
          day.state === "today" ? "today" : "",
          clickable ? "clickable" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            className={classes}
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
