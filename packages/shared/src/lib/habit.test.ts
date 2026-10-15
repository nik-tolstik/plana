import { describe, expect, it } from "vitest";
import type { HabitWithEntriesDto } from "../schemas/habit.js";
import { habitStreaks, isDayDone, isScheduledOn } from "./habit.js";

// 2026-10-05 — понедельник.
const MON = "2026-10-05";
const TUE = "2026-10-06";
const WED = "2026-10-07";
const THU = "2026-10-08";
const FRI = "2026-10-09";
const SAT = "2026-10-10";
const SUN = "2026-10-11";

function habit(overrides: Partial<HabitWithEntriesDto> = {}): HabitWithEntriesDto {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Тест",
    type: "check",
    targetValue: null,
    daysOfWeek: 127,
    color: "gray",
    position: 0,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    entries: [],
    ...overrides,
  };
}

describe("isScheduledOn / isDayDone", () => {
  it("маска 127 — все дни", () => {
    expect([MON, TUE, SUN].map((day) => isScheduledOn(127, day))).toEqual([true, true, true]);
  });

  it("маска 85 (биты 0,2,4,6) — пн/ср/пт/вс", () => {
    expect([MON, TUE, WED, THU].map((day) => isScheduledOn(85, day))).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("check закрыт любым value > 0; number — от targetValue", () => {
    const check = habit({ type: "check" });
    const number = habit({ type: "number", targetValue: 8 });
    expect(isDayDone(check, 0)).toBe(false);
    expect(isDayDone(check, 1)).toBe(true);
    expect(isDayDone(number, 7)).toBe(false);
    expect(isDayDone(number, 8)).toBe(true);
  });
});

describe("habitStreaks", () => {
  it("пустые вхождения — нули", () => {
    expect(habitStreaks(habit(), TUE)).toEqual({ current: 0, best: 0, total: 0 });
  });

  it("вчера и сегодня закрыты — current 2", () => {
    const result = habitStreaks(
      habit({
        entries: [
          { date: MON, value: 1 },
          { date: TUE, value: 1 },
        ],
      }),
      TUE,
    );
    expect(result).toEqual({ current: 2, best: 2, total: 2 });
  });

  it("пропуск ломает серию: best 3, current 2", () => {
    // Пн-ср закрыты, чт пропуск, пт-сб закрыты; сегодня вс ещё не отмечено.
    const entries = [MON, TUE, WED, FRI, SAT].map((date) => ({ date, value: 1 }));
    expect(habitStreaks(habit({ entries }), SUN)).toEqual({ current: 2, best: 3, total: 5 });
  });

  it("незапланированные дни не ломают серию", () => {
    // Только пн-пт; сегодня сб, вчерашняя пт закрыта.
    const entries = [
      { date: THU, value: 1 },
      { date: FRI, value: 1 },
    ];
    expect(habitStreaks(habit({ daysOfWeek: 31, entries }), SAT)).toEqual({
      current: 2,
      best: 2,
      total: 2,
    });
  });

  it("незакрытый сегодня не считается провалом — серия со вчерашнего", () => {
    // Сегодня пн без отметки; вс закрыто, сб нет.
    const entries = [
      { date: SAT, value: 0 },
      { date: SUN, value: 1 },
    ];
    expect(habitStreaks(habit({ entries }), "2026-10-12").current).toBe(1);
  });

  it("вчерашний пропуск обнуляет current при незакрытом сегодня", () => {
    // Сегодня пн без отметки, вс не отмечено.
    expect(habitStreaks(habit({ entries: [{ date: SUN, value: 0 }] }), "2026-10-12").current).toBe(
      0,
    );
  });

  it("number: частичное значение не закрывает день", () => {
    const entries = [
      { date: MON, value: 7 },
      { date: TUE, value: 8 },
    ];
    expect(habitStreaks(habit({ type: "number", targetValue: 8, entries }), TUE)).toEqual({
      current: 1,
      best: 1,
      total: 1,
    });
  });
});
