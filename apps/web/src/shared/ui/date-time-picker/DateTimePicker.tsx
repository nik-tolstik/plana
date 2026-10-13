import { format } from "date-fns";
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
}

/**
 * finnn → Plana (упрощён): без относительных пресетов; дата — календарь в
 * поповере, время — автокомплит. Время применяется только при выбранной дате.
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
      setOpen(false);
    } else {
      onSelect?.(undefined);
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
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={handleDateSelect}
            disabled={disabled}
            locale={ru}
            initialFocus
            captionLayout="dropdown"
          />
        </Popover>
      ) : null}
      {showTime ? (
        <TimeAutocomplete
          options={timeOptions}
          value={timeValue}
          onChange={handleTimeValueChange}
          onFocus={() => setIsTimeInputFocused(true)}
          onSelect={handleTimeSelect}
          onBlur={handleTimeBlur}
        />
      ) : null}
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
