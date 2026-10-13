import type { TaskPriority } from "@plana/shared";

/** Цветовые классы флага приоритета (токены text-priority-* из темы). */
export const PRIORITY_CLASS: Record<TaskPriority, string> = {
  none: "",
  low: "text-priority-low",
  medium: "text-priority-medium",
  high: "text-priority-high",
};
