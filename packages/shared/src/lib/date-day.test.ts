import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  compareDays,
  dayOfWeek,
  isValidDay,
  nextWeekday,
  todayInZone,
} from "./date-day.js";

describe("isValidDay", () => {
  it("принимает корректные даты", () => {
    expect(isValidDay("2026-10-10")).toBe(true);
    expect(isValidDay("2024-02-29")).toBe(true); // високосный год
  });

  it("отклоняет несуществующие даты и мусор", () => {
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("2026-13-01")).toBe(false);
    expect(isValidDay("10.10.2026")).toBe(false);
    expect(isValidDay("2026-1-1")).toBe(false);
  });
});

describe("todayInZone", () => {
  it("учитывает смещение таймзоны", () => {
    // 2026-10-10T23:30Z — в Москве уже 11-е, в UTC ещё 10-е.
    const now = new Date("2026-10-10T23:30:00Z");
    expect(todayInZone(now, "Europe/Moscow")).toBe("2026-10-11");
    expect(todayInZone(now, "UTC")).toBe("2026-10-10");
  });
});

describe("addDays", () => {
  it("переходит через конец месяца и года", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-10", -10)).toBe("2026-09-30");
  });
});

describe("addMonths", () => {
  it("клампит к концу месяца", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28"); // 2026 не високосный
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // високосный
    expect(addMonths("2026-10-15", 2)).toBe("2026-12-15");
  });

  it("переходит через конец года", () => {
    expect(addMonths("2026-12-15", 2)).toBe("2027-02-15");
    expect(addMonths("2026-03-31", -3)).toBe("2025-12-31");
  });
});

describe("dayOfWeek / nextWeekday", () => {
  it("2026-10-10 — суббота (5)", () => {
    expect(dayOfWeek("2026-10-10")).toBe(5);
    expect(dayOfWeek("2026-10-12")).toBe(0); // понедельник
  });

  it("«в пятницу» в субботу — через 6 дней, в пятницу же — +7", () => {
    expect(nextWeekday("2026-10-10", 4)).toBe("2026-10-16"); // пт следующей недели
    expect(nextWeekday("2026-10-16", 4)).toBe("2026-10-23"); // сама пятница не считается
    expect(nextWeekday("2026-10-10", 6)).toBe("2026-10-11"); // завтра воскресенье
  });
});

describe("compareDays", () => {
  it("лексикографический порядок дат корректен", () => {
    expect(compareDays("2026-10-09", "2026-10-10")).toBeLessThan(0);
    expect(compareDays("2026-10-10", "2026-10-10")).toBe(0);
    expect(compareDays("2027-01-01", "2026-12-31")).toBeGreaterThan(0);
  });
});
