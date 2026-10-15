// Контракты сущности приходят из @plana/shared (единый источник с бэкендом).
// Здесь только клиентские расширения: query-ключи, оптимистичные типы и т.п.
export { TASK_PRIORITIES, taskPrioritySchema } from "@plana/shared";
export type { TaskPriority } from "@plana/shared";
export { TASK_PRIORITY_LABELS_RU } from "@/shared/lib/priority-labels";
