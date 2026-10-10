import { z } from "zod";
import { isValidDay } from "../lib/date-day.js";
import { isValidRrule } from "../lib/rrule.js";
import { tagNameSchema, taskTagSchema } from "./tag.js";

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

// --- Форматы полей ---

/** Календарный день YYYY-MM-DD (локальный день пользователя). */
export const dayStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате YYYY-MM-DD")
  .refine(isValidDay, { message: "Несуществующая дата" });

/** Время дня; принимает HH:MM и HH:MM:SS (postgres time). */
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Время в формате HH:MM");

/** RRULE-строка — подмножество RFC 5545 (lib/rrule), напр. `FREQ=WEEKLY;BYDAY=MO,WE`. */
export const rruleSchema = z
  .string()
  .max(100)
  .refine(isValidRrule, { message: "Некорректное правило повтора" });

const titleSchema = z.string().trim().min(1, "Название не может быть пустым").max(500);
const descriptionSchema = z.string().max(10_000);

// --- DTO ---

export const subtaskSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  title: z.string(),
  done: z.boolean(),
  position: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type SubtaskDto = z.infer<typeof subtaskSchema>;

export const taskSchema = z.object({
  id: z.uuid(),
  listId: z.uuid(),
  sectionId: z.uuid().nullable(),
  title: z.string(),
  description: z.string(),
  priority: taskPrioritySchema,
  dueDate: dayStringSchema.nullable(),
  dueTime: timeStringSchema.nullable(),
  rrule: rruleSchema.nullable(),
  rruleStartDate: dayStringSchema.nullable(),
  pinned: z.boolean(),
  position: z.number().int(),
  completedAt: z.iso.datetime().nullable(),
  trashedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  subtasks: z.array(subtaskSchema),
  tags: z.array(taskTagSchema),
});

export type TaskDto = z.infer<typeof taskSchema>;

/** Ответ GET /v1/tasks. */
export const taskListDtoSchema = z.object({
  items: z.array(taskSchema),
  total: z.number().int(),
});

export type TaskListDto = z.infer<typeof taskListDtoSchema>;

// --- Умные списки ---

/** Вычисляемые представления (не хранятся в БД, docs/architecture/erd.md). */
export const SMART_LISTS = [
  "inbox",
  "today",
  "tomorrow",
  "next7",
  "all",
  "completed",
  "trash",
] as const;

export const smartListSchema = z.enum(SMART_LISTS);

export type SmartListKey = z.infer<typeof smartListSchema>;

/** Query GET /v1/tasks (значения приходят строками из URL). */
export const tasksQuerySchema = z
  .object({
    smart: smartListSchema.optional(),
    listId: z.uuid().optional(),
    /** Поиск ILIKE по названию и описанию (pg_trgm). */
    q: z.string().trim().min(1).max(100).optional(),
    /** Только задачи с этим тегом. */
    tagId: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((query) => !(query.smart && query.listId), {
    message: "smart и listId взаимоисключающие",
    path: ["smart"],
  });

export type TasksQuery = z.infer<typeof tasksQuerySchema>;

// --- Запросы ---

/** Полная замена тегов задачи; несуществующие имена создаются неявно. */
const tagNamesSchema = z
  .array(tagNameSchema)
  .max(20, "Не больше 20 тегов")
  .refine((names) => new Set(names.map((name) => name.toLowerCase())).size === names.length, {
    message: "Дубликаты тегов",
  });

export const createTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: dayStringSchema.nullable().optional(),
    dueTime: timeStringSchema.nullable().optional(),
    rrule: rruleSchema.nullable().optional(),
    tagNames: tagNamesSchema.optional(),
    listId: z.uuid().optional(),
    sectionId: z.uuid().nullable().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((dto) => dto.dueTime == null || dto.dueDate != null, {
    message: "Время имеет смысл только вместе с датой",
    path: ["dueTime"],
  })
  .refine((dto) => dto.rrule == null || dto.dueDate != null, {
    message: "Повтор имеет смысл только вместе с датой",
    path: ["rrule"],
  });

export type CreateTaskDto = z.infer<typeof createTaskSchema>;

/**
 * position — целевой индекс (0-based) среди соседей в том же контейнере
 * (listId + sectionId); сервер перенумеровывает соседей с шагом 1024.
 */
export const patchTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: dayStringSchema.nullable().optional(),
    dueTime: timeStringSchema.nullable().optional(),
    rrule: rruleSchema.nullable().optional(),
    tagNames: tagNamesSchema.optional(),
    listId: z.uuid().optional(),
    sectionId: z.uuid().nullable().optional(),
    pinned: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchTaskDto = z.infer<typeof patchTaskSchema>;

export const createSubtaskSchema = z.object({
  title: titleSchema,
});

export type CreateSubtaskDto = z.infer<typeof createSubtaskSchema>;

export const patchSubtaskSchema = z
  .object({
    title: titleSchema.optional(),
    done: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchSubtaskDto = z.infer<typeof patchSubtaskSchema>;

// --- Quick-add ---

/** Результат POST /v1/tasks/parse (ничего не создаёт). */
export const parsedQuickAddSchema = z.object({
  title: z.string(),
  dueDate: dayStringSchema.nullable(),
  dueTime: timeStringSchema.nullable(),
  rrule: rruleSchema.nullable(),
  priority: taskPrioritySchema,
  tags: z.array(z.string()),
});

export type ParsedQuickAddDto = z.infer<typeof parsedQuickAddSchema>;

export const parseQuickAddRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

export type ParseQuickAddRequestDto = z.infer<typeof parseQuickAddRequestSchema>;
