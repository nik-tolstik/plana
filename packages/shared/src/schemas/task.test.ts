import { describe, expect, it } from "vitest";
import { TASK_PRIORITY_LABELS_RU, TASK_PRIORITIES, taskPrioritySchema } from "./task.js";

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
