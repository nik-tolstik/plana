import { addDays, format } from "date-fns";
import { ru } from "date-fns/locale";
import { XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Popover } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/cn";

import { TimeAutocomplete } from "./TimeAutocomplete";
import {
  applyTimeValue,
  createTimeOptions,
  formatTimeValue,
  normalizeTimeInput,
} from "./time-options";

interface DateTimePickerProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  /** Показать кнопку сброса при выбранной дате. */
  clearable?: boolean;
  showTime?: boolean;
  showDate?: boolean;
  timeStepMinutes?: number;
  /**
   * Календарь и время без кнопки-триггера и собственного поповера —
   * для встраивания в чужой поповер (чип даты в строке задачи).
   */
  inline?: boolean;
}

interface QuickPreset {
  label: string;
  /** Смещение в днях от сегодня; null = очистить дату. */
  dayOffset: number | null;
}

const QUICK_PRESETS: QuickPreset[] = [
  { label: "Сегодня", dayOffset: 0 },
  { label: "Завтра", dayOffset: 1 },
  { label: "Неделя", dayOffset: 7 },
  { label: "Без даты", dayOffset: null },
];

/** Выбран ли пресет сейчас (дата совпадает с его днём). */
function presetActive(preset: QuickPreset, date?: Date): boolean {
  if (preset.dayOffset === null) {
    return date === undefined;
  }
  if (date === undefined) return false;
  const target = addDays(new Date(), preset.dayOffset);
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

/**
 * finnn → Plana (упрощён): дата — календарь в поповере с быстрыми пресетами,
 * время — автокомплит. Время применяется только при выбранной дате.
 */
export function DateTimePicker({
  date,
  onSelect,
  placeholder = "Выберите дату",
  disabled,
  className,
  clearable = false,
  showTime = true,
  showDate = true,
  timeStepMinutes = 15,
  inline = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [timeValue, setTimeValue] = React.useState(() => (date ? formatTimeValue(date) : "09:00"));
  const [isTimeInputFocused, setIsTimeInputFocused] = React.useState(false);
  const timeOptions = React.useMemo(() => createTimeOptions(timeStepMinutes), [timeStepMinutes]);

  React.useEffect(() => {
    if (date && !isTimeInputFocused) {
      setTimeValue(formatTimeValue(date));
    }
  }, [date, isTimeInputFocused]);

  const applyCurrentTimeToDate = (targetDate: Date) => {
    return (
      applyTimeValue(targetDate, timeValue) ??
      applyTimeValue(targetDate, date ? formatTimeValue(date) : "09:00")
    );
  };

  const applyTimeToCurrentDate = (value: string) => {
    const targetDate = date ? new Date(date) : new Date();
    const nextDate = applyTimeValue(targetDate, value);
    if (nextDate) {
      onSelect?.(nextDate);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onSelect?.(applyCurrentTimeToDate(selectedDate));
      if (!inline) {
        setOpen(false);
      }
    } else {
      onSelect?.(undefined);
    }
  };

  /** Быстрый пресет: сегодня/завтра/+7 дней — с текущим выбранным временем. */
  const handlePresetSelect = (preset: QuickPreset) => {
    if (preset.dayOffset === null) {
      onSelect?.(undefined);
    } else {
      onSelect?.(applyCurrentTimeToDate(addDays(new Date(), preset.dayOffset)));
    }
    if (!inline) {
      setOpen(false);
    }
  };

  const handleTimeValueChange = (value: string) => {
    setTimeValue(value);

    const normalizedTime = normalizeTimeInput(value);
    if (normalizedTime && date) {
      applyTimeToCurrentDate(normalizedTime);
    }
  };

  const handleTimeSelect = (value: string) => {
    setTimeValue(value);
    if (date) {
      applyTimeToCurrentDate(value);
    }
  };

  const handleTimeBlur = () => {
    setIsTimeInputFocused(false);
    const normalizedTime = normalizeTimeInput(timeValue);

    if (!normalizedTime) {
      setTimeValue(date ? formatTimeValue(date) : "09:00");
      return;
    }

    setTimeValue(normalizedTime);
    if (date) {
      applyTimeToCurrentDate(normalizedTime);
    }
  };

  /** Общая «начинка»: пресеты одной строкой + календарь; время — рядом (в inline внутри). */
  const calendarBody = (
    <>
      <div className="flex gap-1 p-2 pb-0">
        {QUICK_PRESETS.filter((preset) => clearable || preset.dayOffset !== null).map((preset) => {
          const active = presetActive(preset, date);
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              className={cn(
                "min-w-0 flex-1 cursor-pointer truncate rounded-md px-2 py-1.5 text-xs transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary-text"
                  : "text-secondary-foreground hover:bg-surface-hover",
              )}
              onClick={() => handlePresetSelect(preset)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="p-2 pb-1">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={handleDateSelect}
          disabled={disabled}
          locale={ru}
          initialFocus={!inline}
          captionLayout="dropdown"
        />
      </div>
    </>
  );

  const timeInput = showTime ? (
    <TimeAutocomplete
      options={timeOptions}
      value={timeValue}
      onChange={handleTimeValueChange}
      onFocus={() => setIsTimeInputFocused(true)}
      onSelect={handleTimeSelect}
      onBlur={handleTimeBlur}
    />
  ) : null;

  if (inline) {
    return (
      <div className={cn("flex items-start gap-2", className)}>
        <div className="flex flex-col">{calendarBody}</div>
        {timeInput ? <div className="pt-2">{timeInput}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showDate ? (
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom-start"
          className="w-auto overflow-hidden p-0"
          trigger={({ ref, ...triggerProps }) => (
            <Button
              ref={ref}
              type="button"
              variant="field"
              className={cn(
                "w-fit justify-between px-3 text-left font-normal",
                !date && "text-muted-foreground",
              )}
              {...triggerProps}
            >
              {date ? format(date, "dd.MM.yyyy", { locale: ru }) : <span>{placeholder}</span>}
            </Button>
          )}
        >
          {calendarBody}
        </Popover>
      ) : null}
      {showTime && !showDate ? timeInput : null}
      {clearable && date ? (
        <button
          type="button"
          aria-label="Очистить дату"
          title="Очистить дату"
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
          onClick={() => onSelect?.(undefined)}
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
