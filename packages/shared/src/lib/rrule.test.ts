import { describe, expect, it } from "vitest";
import { addDays } from "./date-day.js";
import { formatRrule, nextOccurrence, parseRrule } from "./rrule.js";

/** 2026-10-05 — понедельник, 2026-10-09 — пятница, 2026-10-10 — суббота. */
const MON = "2026-10-05";
const FRI = "2026-10-09";

function rule(rrule: string) {
  return parseRrule(rrule)!;
}

describe("parseRrule / formatRrule", () => {
  it("разбирает полное правило", () => {
    expect(rule("FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=2")).toEqual({
      freq: "WEEKLY",
      interval: 2,
      byDay: [0, 2],
      count: null,
      until: null,
    });
  });

  it("канонический формат — round trip", () => {
    const value = "FREQ=DAILY;INTERVAL=3;COUNT=10";
    expect(formatRrule(rule(value))).toBe(value);
    expect(formatRrule(rule("FREQ=WEEKLY;BYDAY=SU,MO"))).toBe("FREQ=WEEKLY;BYDAY=MO,SU");
  });

  it("отклоняет мусор", () => {
    const invalid = [
      "", // нет FREQ
      "INTERVAL=2", //
      "FREQ=HOURLY",
      "FREQ=DAILY;INTERVAL=0",
      "FREQ=DAILY;INTERVAL=53",
      "FREQ=DAILY;INTERVAL=abc",
      "FREQ=DAILY;COUNT=3;UNTIL=2026-12-31", // взаимоисключающие
      "FREQ=MONTHLY;BYDAY=MO", // MVP: BYDAY только для WEEKLY
      "FREQ=DAILY;BYDAY=XX",
      "FREQ=DAILY;BYDAY=MO,MO", // дубликат дня
      "FREQ=DAILY;UNTIL=2026-02-30", // несуществующая дата
      "FREQ=DAILY;WKST=MO", // неизвестный ключ
      "FREQ=DAILY;FREQ=WEEKLY", // дубликат ключа
      "FREQ=DAILY;", // пустая часть
    ];
    for (const value of invalid) {
      expect(parseRrule(value), value).toBeNull();
    }
  });

  it("принимает COUNT и UNTIL по отдельности", () => {
    expect(rule("FREQ=DAILY;COUNT=3").count).toBe(3);
    expect(rule("FREQ=DAILY;UNTIL=2026-12-31").until).toBe("2026-12-31");
  });
});

describe("nextOccurrence: DAILY", () => {
  it("каждый день", () => {
    const r = rule("FREQ=DAILY");
    expect(nextOccurrence(r, MON, MON)).toBe("2026-10-06");
    expect(nextOccurrence(r, MON, "2026-10-07")).toBe("2026-10-08");
  });

  it("через день", () => {
    const r = rule("FREQ=DAILY;INTERVAL=2");
    expect(nextOccurrence(r, MON, MON)).toBe("2026-10-07");
    expect(nextOccurrence(r, MON, "2026-10-06")).toBe("2026-10-07");
    expect(nextOccurrence(r, MON, "2026-10-07")).toBe("2026-10-09");
  });
});

describe("nextOccurrence: WEEKLY", () => {
  it("без BYDAY — день недели DTSTART", () => {
    const r = rule("FREQ=WEEKLY");
    expect(nextOccurrence(r, FRI, FRI)).toBe("2026-10-16");
    expect(nextOccurrence(r, FRI, "2026-10-14")).toBe("2026-10-16");
  });

  it("с BYDAY — ближайший день шаблона", () => {
    const r = rule("FREQ=WEEKLY;BYDAY=MO,FR");
    expect(nextOccurrence(r, MON, MON)).toBe("2026-10-09"); // пн → пт той же недели
    expect(nextOccurrence(r, MON, "2026-10-09")).toBe("2026-10-12"); // пт → пн
  });

  it("BYDAY с INTERVAL: недели чередуются от недели DTSTART", () => {
    const r = rule("FREQ=WEEKLY;BYDAY=MO;INTERVAL=2");
    // Неделя 2026-10-05 — чётная (индекс 0), 2026-10-12 — индекс 1 (не подходит).
    expect(nextOccurrence(r, MON, MON)).toBe("2026-10-19");
    expect(nextOccurrence(r, MON, "2026-10-12")).toBe("2026-10-19");
  });

  it("BYDAY в DTSTART не совпадает с шаблоном — вхождение всё равно ищется от DTSTART", () => {
    const r = rule("FREQ=WEEKLY;BYDAY=TU"); // DTSTART — понедельник
    expect(nextOccurrence(r, MON, MON)).toBe("2026-10-06");
  });
});

describe("nextOccurrence: MONTHLY / YEARLY", () => {
  it("каждый месяц, день клампится к длине месяца", () => {
    const r = rule("FREQ=MONTHLY");
    expect(nextOccurrence(r, "2027-01-31", "2027-01-31")).toBe("2027-02-28");
    expect(nextOccurrence(r, "2027-01-31", "2027-02-15")).toBe("2027-02-28");
    expect(nextOccurrence(r, "2027-01-31", "2027-02-28")).toBe("2027-03-31");
  });

  it("каждые 2 месяца", () => {
    const r = rule("FREQ=MONTHLY;INTERVAL=2");
    expect(nextOccurrence(r, "2027-01-31", "2027-01-31")).toBe("2027-03-31");
  });

  it("каждый год, 29 февраля → 28", () => {
    const r = rule("FREQ=YEARLY");
    expect(nextOccurrence(r, "2026-05-01", "2026-05-01")).toBe("2027-05-01");
    expect(nextOccurrence(r, "2024-02-29", "2024-02-29")).toBe("2025-02-28");
  });
});

describe("nextOccurrence: COUNT / UNTIL / границы", () => {
  it("COUNT исчерпывается на последнем вхождении", () => {
    const r = rule("FREQ=DAILY;COUNT=3");
    expect(nextOccurrence(r, MON, MON)).toBe("2026-10-06"); // вхождение 1 из 3
    expect(nextOccurrence(r, MON, "2026-10-06")).toBe("2026-10-07"); // 2 из 3
    expect(nextOccurrence(r, MON, "2026-10-07")).toBeNull(); // 3 из 3 — дальше пусто
  });

  it("COUNT с BYDAY считает только подходящие дни", () => {
    const r = rule("FREQ=WEEKLY;BYDAY=MO;COUNT=2");
    expect(nextOccurrence(r, MON, MON)).toBe("2026-10-12");
    expect(nextOccurrence(r, MON, "2026-10-12")).toBeNull();
  });

  it("UNTIL включительно", () => {
    const r = rule("FREQ=DAILY;UNTIL=2026-10-07");
    expect(nextOccurrence(r, MON, "2026-10-06")).toBe("2026-10-07");
    expect(nextOccurrence(r, MON, "2026-10-07")).toBeNull();
  });

  it("after раньше DTSTART — первое вхождение это DTSTART", () => {
    const r = rule("FREQ=DAILY;COUNT=1");
    expect(nextOccurrence(r, MON, addDays(MON, -1))).toBe(MON);
  });
});
