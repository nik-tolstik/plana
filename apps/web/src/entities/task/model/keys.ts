import type { TaskListFilter } from "../api/task-api";

/** Ключи запросов задач; мутации задач инвалидируют all. */
export const taskKeys = {
  all: ["tasks"] as const,
  list: (filter: TaskListFilter) => ["tasks", "list", filter] as const,
};
