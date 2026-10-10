/**
 * Работа с календарными днями (строки YYYY-MM-DD) без библиотек.
 *
 * День — это «локальная календарная дата в таймзоне пользователя» (как due_date
 * в БД, docs/architecture/erd.md). Арифметика через UTC-полдень, чтобы переходы
 * DST не сдвигали день.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** [год, месяц 1..12, день] из YYYY-MM-DD. */
function parseDayParts(day: string): [number, number, number] {
  const [year, month, date] = day.split("-").map(Number);
  return [year ?? 0, month ?? 0, date ?? 0];
}

/** Валидная календарная дата в формате YYYY-MM-DD (не только regex). */
export function isValidDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) return false;
  const [year, month, day] = parseDayParts(value);
  if (month < 1 || month > 12) return false;
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

/** Сегодняшний день (YYYY-MM-DD) в указанной таймзоне. */
export function todayInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // en-CA даёт YYYY-MM-DD.
  return parts;
}

/** Текущее время дня (HH:MM) в указанной таймзоне. */
export function timeInZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

function toUtcNoon(day: string): Date {
  const [year, month, date] = parseDayParts(day);
  return new Date(Date.UTC(year, month - 1, date, 12));
}

function fromUtcNoon(utc: Date): string {
  const year = String(utc.getUTCFullYear()).padStart(4, "0");
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const date = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

/** День + N суток (N может быть отрицательным). */
export function addDays(day: string, amount: number): string {
  const utc = toUtcNoon(day);
  utc.setUTCDate(utc.getUTCDate() + amount);
  return fromUtcNoon(utc);
}

/**
 * День + N месяцев с клампом к концу месяца (31 января + 1 мес = 28/29 февраля).
 * Ручной расчёт вместо setUTCMonth: он перескакивает через месяц (31 янв +1 → 3 марта).
 */
export function addMonths(day: string, amount: number): string {
  const [year, month, date] = parseDayParts(day);
  const totalMonths = year * 12 + (month - 1) + amount;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1; // 1..12
  // День 0 следующего месяца = последний день целевого.
  const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDate = Math.min(date, daysInMonth);
  return `${String(targetYear).padStart(4, "0")}-${String(targetMonth).padStart(2, "0")}-${String(targetDate).padStart(2, "0")}`;
}

/** День недели: 0 = понедельник … 6 = воскресенье. */
export function dayOfWeek(day: string): number {
  const jsDay = toUtcNoon(day).getUTCDay(); // 0 = воскресенье
  return (jsDay + 6) % 7;
}

/**
 * Следующий день с указанным днём недели, не считая сам fromDay
 * («в пятницу», сказенное в пятницу, = следующая пятница).
 */
export function nextWeekday(fromDay: string, target: number): string {
  const offset = (target - dayOfWeek(fromDay) + 7) % 7 || 7;
  return addDays(fromDay, offset);
}

/** Сравнение дней: < 0, если a раньше b. */
export function compareDays(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Сколько суток от a до b (b позже — положительное). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcNoon(b).getTime() - toUtcNoon(a).getTime()) / 86_400_000);
}
