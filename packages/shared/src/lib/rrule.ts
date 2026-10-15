/**
 * Минимальный RRULE-движок (подмножество RFC 5545) на календарных днях.
 *
 * Работает со строками YYYY-MM-DD (lib/date-day), а не с datetime: повтор —
 * свойство локального календарного дня пользователя. Поэтому вместо библиотеки
 * `rrule` (datetime-семантика UTC, месяцы с меньшим числом дней пропускаются)
 * — собственный движок: месячный повтор 31-го числа даёт 28/29 февраля
 * (поведение TickTick), а не пропуск месяца. Формат строки остаётся
 * RFC-совместимым, движок при необходимости заменяется без изменения
 * контрактов (docs/decisions.md, часть 7).
 *
 * Поддерживаемое подмножество: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY,
 * INTERVAL=1..52, BYDAY (только с FREQ=WEEKLY), COUNT=1..999, UNTIL=дата.
 * DTSTART передаётся отдельно (колонка rrule_start_date).
 */

import { addDays, addMonths, compareDays, dayOfWeek, daysBetween, isValidDay } from "./date-day.js";

export const RRULE_FREQS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export type RruleFreq = (typeof RRULE_FREQS)[number];

/** BYDAY-коды RFC 5545; индекс массива = наш день недели (0 = понедельник). */
const BYDAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

const INTERVAL_MAX = 52;
const COUNT_MAX = 999;

export interface RruleRule {
  freq: RruleFreq;
  /** Каждые N единиц частоты (N >= 1). */
  interval: number;
  /** Дни недели для WEEKLY (0 = пн … 6 = вс); пусто = день недели DTSTART. */
  byDay: number[];
  /** Всего вхождений, включая первое (DTSTART). */
  count: number | null;
  /** Последний день повторов включительно. */
  until: string | null;
}

/** Разбирает RRULE-строку; null = некорректная. */
export function parseRrule(value: string): RruleRule | null {
  const parts = value.trim().split(";");
  if (parts.some((part) => part.length === 0)) return null;

  const rule: RruleRule = { freq: "DAILY", interval: 1, byDay: [], count: null, until: null };
  const seen = new Set<string>();
  let hasFreq = false;

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) return null;
    const key = part.slice(0, eq);
    const raw = part.slice(eq + 1);
    if (seen.has(key)) return null;
    seen.add(key);

    if (key === "FREQ") {
      if (!(RRULE_FREQS as readonly string[]).includes(raw)) return null;
      rule.freq = raw as RruleFreq;
      hasFreq = true;
    } else if (key === "INTERVAL") {
      const interval = Number(raw);
      if (!Number.isInteger(interval) || interval < 1 || interval > INTERVAL_MAX) return null;
      rule.interval = interval;
    } else if (key === "BYDAY") {
      const days = new Set<number>();
      for (const code of raw.split(",")) {
        const index = BYDAY_CODES.indexOf(code as (typeof BYDAY_CODES)[number]);
        if (index === -1 || days.has(index)) return null;
        days.add(index);
      }
      rule.byDay = [...days].sort((a, b) => a - b);
    } else if (key === "COUNT") {
      const countValue = Number(raw);
      if (!Number.isInteger(countValue) || countValue < 1 || countValue > COUNT_MAX) return null;
      rule.count = countValue;
    } else if (key === "UNTIL") {
      if (!isValidDay(raw)) return null;
      rule.until = raw;
    } else {
      return null; // неизвестные ключи не принимаем
    }
  }

  if (!hasFreq) return null;
  if (rule.byDay.length > 0 && rule.freq !== "WEEKLY") return null;
  if (rule.count !== null && rule.until !== null) return null; // RFC: взаимоисключающие
  return rule;
}

/** Каноническая строка: FREQ;INTERVAL;BYDAY;COUNT;UNTIL. */
export function formatRrule(rule: RruleRule): string {
  const parts = [`FREQ=${rule.freq}`];
  if (rule.interval !== 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.byDay.length > 0) {
    parts.push(`BYDAY=${rule.byDay.map((day) => BYDAY_CODES[day]).join(",")}`);
  }
  if (rule.count !== null) parts.push(`COUNT=${rule.count}`);
  if (rule.until !== null) parts.push(`UNTIL=${rule.until}`);
  return parts.join(";");
}

export function isValidRrule(value: string): boolean {
  return parseRrule(value) !== null;
}

// --- Вычисление вхождений ---

/** Понедельник недели дня. */
function weekStart(day: string): string {
  return addDays(day, -dayOfWeek(day));
}

/** Номер недели от недели dtstart (0 = неделя dtstart). */
function weekIndex(dtstart: string, day: string): number {
  return Math.floor(daysBetween(weekStart(dtstart), weekStart(day)) / 7);
}

/** День подходит под шаблон WEEKLY;BYDAY (от dtstart, интервалы недель). */
function matchesByDay(dtstart: string, day: string, rule: RruleRule): boolean {
  return rule.byDay.includes(dayOfWeek(day)) && weekIndex(dtstart, day) % rule.interval === 0;
}

/** Сколько месяцев от a до b по календарю (b позже — положительное). */
function monthsBetween(a: string, b: string): number {
  return (
    (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 +
    (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))
  );
}

/**
 * Первое вхождение строго после `after`. Вхождения существуют от DTSTART
 * включительно (DTSTART — вхождение №0, для BYDAY — только если день
 * подходит под шаблон). null = правило исчерпано (COUNT/UNTIL).
 */
export function nextOccurrence(rule: RruleRule, dtstart: string, after: string): string | null {
  // Вхождения раньше DTSTART не определены.
  const from = compareDays(after, dtstart) < 0 ? addDays(dtstart, -1) : after;

  let candidate: string;
  let index: number;

  if (rule.freq === "WEEKLY" && rule.byDay.length > 0) {
    // Период = interval недель, в каждом подходящем периоде есть вхождения —
    // ищем первым подходящим днём прямым проходом (ограничен одним периодом).
    candidate = "";
    for (
      let day = addDays(from, 1);
      daysBetween(from, day) <= rule.interval * 7 + 7;
      day = addDays(day, 1)
    ) {
      if (compareDays(day, dtstart) >= 0 && matchesByDay(dtstart, day, rule)) {
        candidate = day;
        break;
      }
    }
    if (candidate === "") return null;
    // 0-based индекс кандидата = число вхождений в [dtstart, from] (все они раньше).
    index = 0;
    for (let day = dtstart; compareDays(day, from) <= 0; day = addDays(day, 1)) {
      if (matchesByDay(dtstart, day, rule)) index += 1;
    }
  } else if (rule.freq === "DAILY" || rule.freq === "WEEKLY") {
    // DAILY — каждые interval дней; WEEKLY без BYDAY — каждые interval недель
    // в день недели DTSTART. Вхождение №k = dtstart + k * interval * (7 для WEEKLY).
    const period = rule.freq === "DAILY" ? rule.interval : rule.interval * 7;
    const diff = daysBetween(dtstart, from);
    index = diff < 0 ? 0 : Math.floor(diff / period) + 1;
    candidate = addDays(dtstart, index * period);
  } else {
    // MONTHLY/YEARLY — вхождение №k в месяце k*period от DTSTART с клампом
    // дня к длине месяца (31 января → 28/29 февраля). Из-за клампа вхождение
    // текущего месячного слота может лежать после from — проверяем явно.
    const period = rule.freq === "MONTHLY" ? rule.interval : rule.interval * 12;
    index = Math.max(0, Math.floor(monthsBetween(dtstart, from) / period));
    candidate = addMonths(dtstart, index * period);
    if (compareDays(candidate, from) <= 0) {
      index += 1;
      candidate = addMonths(dtstart, index * period);
    }
  }

  if (rule.count !== null && index >= rule.count) return null;
  if (rule.until !== null && compareDays(candidate, rule.until) > 0) return null;
  return candidate;
}
