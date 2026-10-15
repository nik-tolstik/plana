import { describe, expect, it } from "vitest";
import { TASK_PRIORITIES } from "@plana/shared";
import { TASK_PRIORITY_LABELS_RU } from "./priority-labels";

describe("TASK_PRIORITY_LABELS_RU", () => {
  it("у каждого приоритета есть русская подпись", () => {
    for (const priority of TASK_PRIORITIES) {
      expect(TASK_PRIORITY_LABELS_RU[priority].length).toBeGreaterThan(0);
    }
  });
});
