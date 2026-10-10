import { describe, expect, it } from "vitest";
import {
  TASK_PRIORITY_LABELS_RU,
  TASK_PRIORITIES,
  createSubtaskSchema,
  createTaskSchema,
  patchSubtaskSchema,
  patchTaskSchema,
  smartListSchema,
  taskPrioritySchema,
  tasksQuerySchema,
  timeStringSchema,
} from "./task.js";

describe("taskPrioritySchema", () => {
  it("принимает все значения TASK_PRIORITIES", () => {
    for (const priority of TASK_PRIORITIES) {
      expect(taskPrioritySchema.parse(priority)).toBe(priority);
    }
  });

  it("отклоняет неизвестные значения", () => {
    expect(() => taskPrioritySchema.parse("urgent")).toThrow();
  });

  it("у каждого приоритета есть русская подпись", () => {
    for (const priority of TASK_PRIORITIES) {
      expect(TASK_PRIORITY_LABELS_RU[priority].length).toBeGreaterThan(0);
    }
  });
});

describe("timeStringSchema", () => {
  it("принимает HH:MM и HH:MM:SS", () => {
    expect(timeStringSchema.parse("09:30")).toBe("09:30");
    expect(timeStringSchema.parse("23:59:59")).toBe("23:59:59");
    expect(timeStringSchema.parse("00:00")).toBe("00:00");
  });

  it("отклоняет невозможное время", () => {
    expect(() => timeStringSchema.parse("24:00")).toThrow();
    expect(() => timeStringSchema.parse("9:30")).toThrow();
    expect(() => timeStringSchema.parse("09:60")).toThrow();
  });
});

describe("createTaskSchema", () => {
  it("минимальный create — только title", () => {
    expect(createTaskSchema.parse({ title: "Купить хлеб" })).toEqual({ title: "Купить хлеб" });
  });

  it("полный create", () => {
    const dto = createTaskSchema.parse({
      title: "Созвон",
      description: "Обсудить релиз",
      priority: "high",
      dueDate: "2026-10-16",
      dueTime: "11:00",
      pinned: true,
    });
    expect(dto.priority).toBe("high");
    expect(dto.dueDate).toBe("2026-10-16");
  });

  it("время без даты запрещено", () => {
    expect(() => createTaskSchema.parse({ title: "Созвон", dueTime: "11:00" })).toThrow();
  });

  it("несуществующая дата отклоняется", () => {
    expect(() => createTaskSchema.parse({ title: "Созвон", dueDate: "2026-02-30" })).toThrow();
  });
});

describe("patchTaskSchema", () => {
  it("пустой patch отклоняется", () => {
    expect(() => patchTaskSchema.parse({})).toThrow();
  });

  it("аннулирование даты допустимо", () => {
    expect(patchTaskSchema.parse({ dueDate: null, dueTime: null })).toEqual({
      dueDate: null,
      dueTime: null,
    });
  });
});

describe("subtask-схемы", () => {
  it("create подзадачи", () => {
    expect(createSubtaskSchema.parse({ title: "Шаг 1" })).toEqual({ title: "Шаг 1" });
    expect(() => createSubtaskSchema.parse({ title: "" })).toThrow();
  });

  it("patch подзадачи: done и position, пустой — ошибка", () => {
    expect(patchSubtaskSchema.parse({ done: true })).toEqual({ done: true });
    expect(patchSubtaskSchema.parse({ position: 0 })).toEqual({ position: 0 });
    expect(() => patchSubtaskSchema.parse({})).toThrow();
  });
});

describe("tasksQuerySchema", () => {
  it("числа coerse из строк query", () => {
    const query = tasksQuerySchema.parse({ smart: "today", limit: "25", offset: "50" });
    expect(query).toEqual({ smart: "today", limit: 25, offset: 50 });
  });

  it("дефолты limit/offset", () => {
    expect(tasksQuerySchema.parse({})).toEqual({ limit: 50, offset: 0 });
  });

  it("smart и listId вместе запрещены", () => {
    expect(() =>
      tasksQuerySchema.parse({ smart: "today", listId: "0b7bb8b8-6b3e-4a52-b2be-b23e5f9a34f3" }),
    ).toThrow();
  });

  it("неизвестный smart отклоняется", () => {
    expect(() => tasksQuerySchema.parse({ smart: "someday" })).toThrow();
  });
});

describe("smartListSchema", () => {
  it("все ключи умных списков", () => {
    for (const key of ["inbox", "today", "tomorrow", "next7", "all", "completed", "trash"]) {
      expect(smartListSchema.parse(key)).toBe(key);
    }
  });
});
