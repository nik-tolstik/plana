import { z } from "zod";

/** Приоритет задачи. Порядок = возрастание важности. */
export const TASK_PRIORITIES = ["none", "low", "medium", "high"] as const;

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const TASK_PRIORITY_LABELS_RU: Record<TaskPriority, string> = {
  none: "Без приоритета",
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};
