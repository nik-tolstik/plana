import { describe, expect, it } from "vitest";
import { HABIT_TYPE_LABELS_RU, HABIT_WEEKDAY_SHORT_RU, habitScheduleLabel } from "./habit-label";

describe("habitScheduleLabel", () => {
  it("127 — каждый день", () => {
    expect(habitScheduleLabel(127)).toBe("каждый день");
  });

  it("42 (вт, чт, сб) — по-русски", () => {
    expect(habitScheduleLabel(42)).toBe("вт, чт, сб");
  });

  it("0 — нет дней", () => {
    expect(habitScheduleLabel(0)).toBe("нет дней");
  });
});

describe("HABIT_TYPE_LABELS_RU", () => {
  it("подписи непустые", () => {
    expect(HABIT_TYPE_LABELS_RU.check.length).toBeGreaterThan(0);
    expect(HABIT_TYPE_LABELS_RU.number.length).toBeGreaterThan(0);
  });
});

describe("HABIT_WEEKDAY_SHORT_RU", () => {
  it("семь дней с понедельника", () => {
    expect(HABIT_WEEKDAY_SHORT_RU).toHaveLength(7);
    expect(HABIT_WEEKDAY_SHORT_RU[0]).toBe("пн");
    expect(HABIT_WEEKDAY_SHORT_RU[6]).toBe("вс");
  });
});
