export interface TimeOption {
  value: string;
  label: string;
}

const MINUTES_IN_DAY = 24 * 60;

export function formatTimeValue(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function normalizeTimeInput(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return undefined;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function applyTimeValue(date: Date, timeValue: string): Date | undefined {
  const normalized = normalizeTimeInput(timeValue);
  if (!normalized) return undefined;

  const nextDate = new Date(date);
  nextDate.setHours(Number(normalized.slice(0, 2)), Number(normalized.slice(3)), 0, 0);
  return nextDate;
}

/** Сетка вариантов времени с шагом stepMinutes (для TimeAutocomplete). */
export function createTimeOptions(stepMinutes = 15): TimeOption[] {
  const normalizedStep = Number.isInteger(stepMinutes) && stepMinutes > 0 ? stepMinutes : 15;
  const options: TimeOption[] = [];

  for (let totalMinutes = 0; totalMinutes < MINUTES_IN_DAY; totalMinutes += normalizedStep) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const value = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    options.push({ value, label: value });
  }

  return options;
}
