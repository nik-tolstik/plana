import {
  compareDays,
  addDays,
  addMonths,
  isValidDay,
  nextWeekday,
  timeInZone,
  todayInZone,
} from "./date-day.js";
import { taskPrioritySchema, type TaskPriority } from "../schemas/task.js";

/**
 * Разбор строки быстрого ввода на русском: «Встреча в пятницу в 17 !!!».
 * Чистая функция — используется и вебом (мгновенное превью), и api
 * (POST /v1/tasks/parse, docs/architecture/api.md).
 *
 * Распознаваемые токены удаляются из заголовка:
 * - приоритет: «!» / «!!» / «!!!» отдельным словом
 * - дата: сегодня / завтра / послезавтра, «через N дней/недель», «через месяц»,
 *   «в пн…в вс» (полные и краткие названия), «25 декабря» / «25 дек»,
 *   дд.мм(.гггг|гг), ISO yyyy-mm-dd
 * - время: «17:30», «в 17» (часы 0–23; время без даты → сегодня или завтра)
 * Дата без года в прошлом → следующий год (поведение TickTick).
 */

export interface QuickAddContext {
  /** Текущий момент. */
  now: Date;
  /** Таймзона пользователя — определяет «сегодня». */
  timeZone: string;
}

export interface ParsedQuickAdd {
  title: string;
  dueDate: string | null;
  /** HH:MM; сервер хранит HH:MM:SS. */
  dueTime: string | null;
  priority: TaskPriority;
}

// \b в JS определён через [A-Za-z0-9_] и не работает с кириллицей —
// границу слова задаём негативным просмотром на русскую букву.
const WEEKDAYS: Array<{ pattern: string; dow: number }> = [
  { pattern: "понедельник[ау]?|пн(?![а-яё])", dow: 0 },
  { pattern: "вторник[а]?|вт(?![а-яё])", dow: 1 },
  { pattern: "сред[уы]|ср(?![а-яё])", dow: 2 },
  { pattern: "четверг[а]?|чт(?![а-яё])", dow: 3 },
  { pattern: "пятниц[уе]|пт(?![а-яё])", dow: 4 },
  { pattern: "суббот[уе]|сб(?![а-яё])", dow: 5 },
  { pattern: "воскресень[ея]|вс(?![а-яё])", dow: 6 },
];

// Именительный и родительный падеж + трёхбуквенные сокращения.
const MONTHS: Record<number, string> = {
  1: "январ[ья]|янв",
  2: "феврал[ья]|фев",
  3: "март[а]?|мар",
  4: "апрел[ья]|апр",
  5: "ма[йя]",
  6: "июн[ья]|июн",
  7: "июл[ья]|июл",
  8: "август[а]?|авг",
  9: "сентябр[ья]|сен",
  10: "октябр[ья]|окт",
  11: "ноябр[ья]|ноя",
  12: "декабр[ья]|дек",
};

const MONTH_PATTERN = Object.entries(MONTHS)
  .map(([month, alt]) => `(?<month${month}>${alt})`)
  .join("|");

const FULL_TIME_RE = /(?:^|\s)(?:в\s+)?(\d{1,2})[:.](\d{2})(?=\s|$)/i;
const BARE_HOUR_RE = /(?:^|\s)в\s+(\d{1,2})(?=\s|$)/i;
const PRIORITY_RE = /(?:^|\s)(!{1,3})(?=\s|$)/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildDay(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

/** Удаляет матч из текста, оставляя по одному пробелу на месте. */
function cutOut(text: string, match: RegExpMatchArray): string {
  return text.replace(match[0], " ");
}

function collapseSpaces(text: string): string {
  return text.replaceAll(/\s+/g, " ").trim();
}

function parsePriority(text: string): { text: string; priority: TaskPriority } {
  const match = text.match(PRIORITY_RE);
  if (!match || match[1] === undefined) return { text, priority: "none" };
  const priority = match[1].length === 3 ? "high" : match[1].length === 2 ? "medium" : "low";
  return { text: cutOut(text, match), priority };
}

function parseTime(text: string): { text: string; time: string | null } {
  const full = text.match(FULL_TIME_RE);
  if (full) {
    const hours = Number(full[1] ?? 99);
    const minutes = Number(full[2] ?? 99);
    if (hours <= 23 && minutes <= 59) {
      return { text: cutOut(text, full), time: `${pad2(hours)}:${pad2(minutes)}` };
    }
  }
  const bare = text.match(BARE_HOUR_RE);
  if (bare) {
    const hours = Number(bare[1] ?? 99);
    if (hours <= 23) {
      return { text: cutOut(text, bare), time: `${pad2(hours)}:00` };
    }
  }
  return { text, time: null };
}

function parseDate(
  text: string,
  today: string,
  currentYear: number,
): { text: string; date: string | null } {
  // Слова: сегодня / завтра / послезавтра.
  let match = text.match(/(?:^|\s)(сегодня|завтра|послезавтра)(?=\s|$)/i);
  if (match && match[1] !== undefined) {
    const word = match[1].toLowerCase();
    const date = word === "сегодня" ? today : addDays(today, word === "завтра" ? 1 : 2);
    return { text: cutOut(text, match), date };
  }

  // «через N дней/недель», «через день/неделю/месяц».
  match = text.match(
    /(?:^|\s)через\s+(?:(\d{1,2})\s+)?(д(?:ень|ня|ней)|недел[юьи]|месяц)(?=\s|$)/i,
  );
  if (match && match[2] !== undefined) {
    const amount = match[1] ? Number(match[1]) : 1;
    const unit = match[2].toLowerCase();
    if (amount >= 1 && amount <= 52) {
      const date = unit.startsWith("м")
        ? addMonths(today, amount)
        : addDays(today, amount * (unit.startsWith("н") ? 7 : 1));
      return { text: cutOut(text, match), date };
    }
  }

  // День недели с предлогом: «в пятницу», «во вторник», «в пн».
  for (const weekday of WEEKDAYS) {
    match = text.match(new RegExp(`(?:^|\\s)во?\\s+(${weekday.pattern})(?=\\s|$)`, "i"));
    if (match) {
      return { text: cutOut(text, match), date: nextWeekday(today, weekday.dow) };
    }
  }

  // «25 декабря» / «25 дек» / «25 декабря 2027».
  match = text.match(
    new RegExp(`(?:^|\\s)(\\d{1,2})\\s+(?:${MONTH_PATTERN})(?:\\s+(?<year>\\d{4}))?(?=\\s|$)`, "i"),
  );
  if (match) {
    const day = Number(match[1]);
    const month = Number(
      Object.entries(match.groups ?? {})
        .find(([, v]) => v !== undefined)?.[0]
        .replace("month", "") ?? 0,
    );
    const year = match.groups?.year ? Number(match.groups.year) : null;
    const candidate = buildDay(year ?? currentYear, month, day);
    if (isValidDay(candidate)) {
      // Дата без года уже прошла — следующий год (TickTick-поведение).
      const date =
        year === null && compareDays(candidate, today) < 0
          ? buildDay(currentYear + 1, month, day)
          : candidate;
      return { text: cutOut(text, match), date };
    }
  }

  // дд.мм(.гггг|гг) — например 25.12, 25.12.2027, 25.12.27.
  match = text.match(/(?:^|\s)(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2}))?(?=\s|$)/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const rawYear = match[3] ? Number(match[3]) : null;
    const year = rawYear === null ? null : rawYear < 100 ? 2000 + rawYear : rawYear;
    const candidate = buildDay(year ?? currentYear, month, day);
    if (isValidDay(candidate) && month >= 1 && month <= 12) {
      const date =
        year === null && compareDays(candidate, today) < 0
          ? buildDay(currentYear + 1, month, day)
          : candidate;
      return { text: cutOut(text, match), date };
    }
  }

  // ISO yyyy-mm-dd.
  match = text.match(/(?:^|\s)(\d{4})-(\d{2})-(\d{2})(?=\s|$)/);
  if (match) {
    const candidate = buildDay(Number(match[1]), Number(match[2]), Number(match[3]));
    if (isValidDay(candidate)) {
      return { text: cutOut(text, match), date: candidate };
    }
  }

  return { text, date: null };
}

/**
 * Разбирает строку быстрого ввода. Приоритет и даты вырезаются из заголовка;
 * если после вырезания заголовок пуст — возвращается исходная строка без разбора.
 */
export function parseQuickAdd(input: string, context: QuickAddContext): ParsedQuickAdd {
  const today = todayInZone(context.now, context.timeZone);
  const currentYear = Number(today.slice(0, 4));

  let text = input.trim();
  if (text.length === 0) {
    return { title: "", dueDate: null, dueTime: null, priority: "none" };
  }

  const priorityResult = parsePriority(text);
  text = priorityResult.text;
  const dateResult = parseDate(text, today, currentYear);
  text = dateResult.text;
  const timeResult = parseTime(text);
  text = timeResult.text;

  const title = collapseSpaces(text);
  if (title.length === 0) {
    // Вся строка распозналась как атрибуты — возвращаем как есть, без разбора.
    return { title: input.trim(), dueDate: null, dueTime: null, priority: "none" };
  }

  let dueDate = dateResult.date;
  const dueTime = timeResult.time;
  if (dueTime !== null && dueDate === null) {
    // Время без даты: сегодня, если время ещё не прошло, иначе завтра.
    const nowTime = timeInZone(context.now, context.timeZone);
    dueDate = dueTime > nowTime ? today : addDays(today, 1);
  }

  return {
    title,
    dueDate,
    dueTime,
    priority: taskPrioritySchema.parse(priorityResult.priority),
  };
}
