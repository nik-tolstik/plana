import {
  compareDays,
  addDays,
  addMonths,
  dayOfWeek,
  isValidDay,
  nextWeekday,
  timeInZone,
  todayInZone,
} from "./date-day.js";
import { formatRrule, type RruleRule } from "./rrule.js";
import { taskPrioritySchema, type TaskPriority } from "../schemas/task.js";

/**
 * Разбор строки быстрого ввода на русском: «Встреча в пятницу в 17 !!!».
 * Чистая функция — используется и вебом (мгновенное превью), и api
 * (POST /v1/tasks/parse, docs/architecture/api.md).
 *
 * Распознаваемые токены удаляются из заголовка:
 * - приоритет: «!» / «!!» / «!!!» отдельным словом
 * - повтор: «ежедневно», «по будням», «каждый день», «каждые 2 недели»…
 * - дата: сегодня / завтра / послезавтра, «через N дней/недель», «через месяц»,
 *   «в пн…в вс» (полные и краткие названия), «25 декабря» / «25 дек»,
 *   дд.мм(.гггг|гг), ISO yyyy-mm-dd
 * - время: «17:30», «в 17» (часы 0–23; время без даты → сегодня или завтра)
 * - теги: «#хештег» (кириллица/латиница/цифры/-/_), вырезаются из заголовка
 * Дата без года в прошлом → следующий год (поведение TickTick).
 * Повтор без даты → сегодня (шаблон начинается с сегодняшнего дня).
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
  rrule: string | null;
  /** Имена тегов из «#хештегов»; создаются неявно при сохранении задачи. */
  tags: string[];
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

function baseRule(freq: RruleRule["freq"], byDay: number[] = [], interval = 1): RruleRule {
  return { freq, interval, byDay, count: null, until: null };
}

// Простые повторы одним словом/фразой.
const SIMPLE_REPEATS: Array<{ re: RegExp; rule: RruleRule }> = [
  { re: /(?:^|\s)ежедневно(?=\s|$)/i, rule: baseRule("DAILY") },
  { re: /(?:^|\s)по\s+будням(?=\s|$)/i, rule: baseRule("WEEKLY", [0, 1, 2, 3, 4]) },
  { re: /(?:^|\s)по\s+выходным(?=\s|$)/i, rule: baseRule("WEEKLY", [5, 6]) },
  { re: /(?:^|\s)еженедельно(?=\s|$)/i, rule: baseRule("WEEKLY") },
  { re: /(?:^|\s)ежемесячно(?=\s|$)/i, rule: baseRule("MONTHLY") },
  { re: /(?:^|\s)ежегодно(?=\s|$)/i, rule: baseRule("YEARLY") },
];

// «каждый день», «каждую неделю», «каждые 2 недели», «каждые 3 месяца»…
const EVERY_REPEAT_RE =
  /(?:^|\s)кажд(?:ый|ую|ое|ые|ых)\s+(?:(\d{1,2})\s+)?(день|дня|дней|недел[ьюияе][ьяиоею]*|месяц[а-яё]*|год[а-яё]*|лет)(?=\s|$)/i;

/**
 * Первый день >= today, попадающий в byDay (для WEEKLY-шаблонов: якорем
 * повтора должен быть день шаблона, иначе dueDate — не вхождение).
 */
function firstByDayFrom(today: string, byDay: number[]): string {
  if (byDay.includes(dayOfWeek(today))) return today;
  let best: string | null = null;
  for (const dow of byDay) {
    const candidate = nextWeekday(today, dow);
    if (best === null || candidate < best) best = candidate;
  }
  return best ?? today;
}

interface RepeatResult {
  text: string;
  rrule: string | null;
  /** Якорь повтора, если дата не указана явно; null = сегодня. */
  anchor: string | null;
}

function parseRepeat(text: string, today: string): RepeatResult {
  for (const { re, rule } of SIMPLE_REPEATS) {
    const match = text.match(re);
    if (match) {
      const anchor = rule.byDay.length > 0 ? firstByDayFrom(today, rule.byDay) : null;
      return { text: cutOut(text, match), rrule: formatRrule(rule), anchor };
    }
  }
  const match = text.match(EVERY_REPEAT_RE);
  if (match && match[2] !== undefined) {
    const amount = match[1] ? Number(match[1]) : 1;
    if (amount >= 1 && amount <= 52) {
      const unit = match[2].toLowerCase();
      const freq: RruleRule["freq"] = unit.startsWith("д")
        ? "DAILY"
        : unit.startsWith("н")
          ? "WEEKLY"
          : unit.startsWith("м")
            ? "MONTHLY"
            : "YEARLY";
      return {
        text: cutOut(text, match),
        rrule: formatRrule(baseRule(freq, [], amount)),
        anchor: null,
      };
    }
  }

  // «каждую пятницу», «каждый пн» — недельный повтор в этот день недели.
  for (const weekday of WEEKDAYS) {
    const weekdayMatch = text.match(
      new RegExp(`(?:^|\\s)кажд(?:ый|ую|ое|ые|ых)\\s+(${weekday.pattern})(?=\\s|$)`, "i"),
    );
    if (weekdayMatch) {
      const byDay = [weekday.dow];
      return {
        text: cutOut(text, weekdayMatch),
        rrule: formatRrule(baseRule("WEEKLY", byDay)),
        anchor: firstByDayFrom(today, byDay),
      };
    }
  }
  return { text, rrule: null, anchor: null };
}

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

// #хештег: буквы/цифры/-/_ (кириллица включена), 1..50 символов.
const HASHTAG_RE = /(?:^|\s)#([а-яёa-z0-9_-]{1,50})(?=\s|$)/gi;

/** Вырезает «#хештеги», возвращает чистый текст и уникальные имена тегов. */
function parseHashtags(text: string): { text: string; tags: string[] } {
  const tags: string[] = [];
  let rest = text;
  for (const match of text.matchAll(HASHTAG_RE)) {
    const name = match[1];
    if (name !== undefined) {
      if (!tags.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
        tags.push(name);
      }
      rest = rest.replace(match[0], " ");
    }
  }
  return { text: rest, tags };
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
    return { title: "", dueDate: null, dueTime: null, rrule: null, tags: [], priority: "none" };
  }

  const priorityResult = parsePriority(text);
  text = priorityResult.text;
  const repeatResult = parseRepeat(text, today);
  text = repeatResult.text;
  const dateResult = parseDate(text, today, currentYear);
  text = dateResult.text;
  const timeResult = parseTime(text);
  text = timeResult.text;
  const hashtagResult = parseHashtags(text);
  text = hashtagResult.text;

  const title = collapseSpaces(text);
  if (title.length === 0) {
    // Вся строка распозналась как атрибуты — возвращаем как есть, без разбора.
    return {
      title: input.trim(),
      dueDate: null,
      dueTime: null,
      rrule: null,
      tags: [],
      priority: "none",
    };
  }

  let dueDate = dateResult.date;
  const dueTime = timeResult.time;
  if (dueTime !== null && dueDate === null) {
    // Время без даты: сегодня, если время ещё не прошло, иначе завтра.
    const nowTime = timeInZone(context.now, context.timeZone);
    dueDate = dueTime > nowTime ? today : addDays(today, 1);
  }
  // Повтор без даты начинается сегодня (даже если время уже прошло);
  // для WEEKLY;BYDAY якорь — первый день шаблона от сегодняшнего.
  if (repeatResult.rrule !== null && dateResult.date === null) {
    dueDate = repeatResult.anchor ?? today;
  }

  return {
    title,
    dueDate,
    dueTime,
    rrule: repeatResult.rrule,
    tags: hashtagResult.tags,
    priority: taskPrioritySchema.parse(priorityResult.priority),
  };
}
