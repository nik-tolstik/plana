import type { TaskPriority } from "@plana/shared";

/**
 * Русские подписи приоритетов. Живут в web, а не в контракте @plana/shared:
 * API значения не показывает, контракт хранит только сами значения.
 */
export const TASK_PRIORITY_LABELS_RU: Record<TaskPriority, string> = {
  none: "Без приоритета",
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};
