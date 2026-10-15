import { describe, expect, it } from "vitest";
import { rruleValueLabel } from "./rrule-label";

describe("rruleValueLabel", () => {
  it("русские метки", () => {
    expect(rruleValueLabel("FREQ=DAILY")).toBe("Каждый день");
    expect(rruleValueLabel("FREQ=DAILY;INTERVAL=2")).toBe("Каждые 2 дня");
    expect(rruleValueLabel("FREQ=DAILY;INTERVAL=5")).toBe("Каждые 5 дней");
    expect(rruleValueLabel("FREQ=WEEKLY")).toBe("Каждую неделю");
    expect(rruleValueLabel("FREQ=WEEKLY;BYDAY=MO,WE")).toBe("Каждую неделю: пн, ср");
    expect(rruleValueLabel("FREQ=WEEKLY;INTERVAL=2;BYDAY=FR")).toBe("Каждые 2 недели: пт");
    expect(rruleValueLabel("FREQ=MONTHLY")).toBe("Каждый месяц");
    expect(rruleValueLabel("FREQ=MONTHLY;INTERVAL=3")).toBe("Каждые 3 месяца");
    expect(rruleValueLabel("FREQ=YEARLY")).toBe("Каждый год");
    expect(rruleValueLabel("FREQ=DAILY;COUNT=3")).toBe("Каждый день · 3 раза");
  });

  it("некорректная строка показывается как есть", () => {
    expect(rruleValueLabel("FREQ=HOURLY")).toBe("FREQ=HOURLY");
  });
});
