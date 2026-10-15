import { parseRrule, type RruleRule } from "@plana/shared";

/** Русские сокращения дней недели; индекс 0 = понедельник. */
export const WEEKDAY_SHORT_RU = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

/** Русская форма множественного числа: 1 день, 2 дня, 5 дней. */
function pluralRu(amount: number, one: string, few: string, many: string): string {
  const mod10 = amount % 10;
  const mod100 = amount % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Метка правила: «Каждый день», «Каждые 2 недели: пн, ср». */
export function rruleLabelRu(rule: RruleRule): string {
  const n = rule.interval;
  let base: string;
  if (rule.freq === "DAILY") {
    base = n === 1 ? "Каждый день" : `Каждые ${n} ${pluralRu(n, "день", "дня", "дней")}`;
  } else if (rule.freq === "WEEKLY") {
    const days = rule.byDay.map((day) => WEEKDAY_SHORT_RU[day]).join(", ");
    base = n === 1 ? "Каждую неделю" : `Каждые ${n} ${pluralRu(n, "неделю", "недели", "недель")}`;
    if (days) base += `: ${days}`;
  } else if (rule.freq === "MONTHLY") {
    base = n === 1 ? "Каждый месяц" : `Каждые ${n} ${pluralRu(n, "месяц", "месяца", "месяцев")}`;
  } else {
    base = n === 1 ? "Каждый год" : `Каждые ${n} ${pluralRu(n, "год", "года", "лет")}`;
  }
  if (rule.count !== null) {
    base += ` · ${rule.count} ${pluralRu(rule.count, "раз", "раза", "раз")}`;
  }
  if (rule.until !== null) {
    base += ` · до ${rule.until.split("-").reverse().join(".")}`;
  }
  return base;
}

/** Метка для RRULE-строки (для UI); некорректная строка показывается как есть. */
export function rruleValueLabel(value: string): string {
  const rule = parseRrule(value);
  return rule === null ? value : rruleLabelRu(rule);
}
