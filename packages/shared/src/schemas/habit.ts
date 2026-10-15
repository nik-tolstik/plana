import { z } from "zod";
import { LIST_COLORS, listColorSchema } from "./structure.js";
import { dayStringSchema } from "./task.js";

/** Тип привычки: чекбокс (выполнено/нет) или число (прогресс к цели в день). */
export const HABIT_TYPES = ["check", "number"] as const;

export const habitTypeSchema = z.enum(HABIT_TYPES);

export type HabitType = z.infer<typeof habitTypeSchema>;

/** Палитра привычек — та же, что у списков (мапится в те же CSS-цвета). */
export const HABIT_COLORS = LIST_COLORS;

export const habitColorSchema = listColorSchema;

/** Дни недели пн..вс — битовая маска (бит 0 = понедельник, 127 = все дни). */
export const daysOfWeekSchema = z.number().int().min(1).max(127);

const nameSchema = z.string().trim().min(1, "Название не может быть пустым").max(100);

// --- DTO ---

/** Отметка за день (из окна последних 60 дней). */
export const habitEntryValueSchema = z.object({
  date: dayStringSchema,
  value: z.number().int().min(0),
});

export type HabitEntryValueDto = z.infer<typeof habitEntryValueSchema>;

/** Привычка с вхождениями за последние 60 дней — ответ GET /v1/habits. */
export const habitWithEntriesSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: habitTypeSchema,
  /** Цель в день; только для type='number'. */
  targetValue: z.number().int().nullable(),
  daysOfWeek: daysOfWeekSchema,
  color: habitColorSchema,
  position: z.number().int(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  entries: z.array(habitEntryValueSchema),
});

export type HabitWithEntriesDto = z.infer<typeof habitWithEntriesSchema>;

/** Полная отметка (ответ PUT /v1/habits/:id/entries/:date). */
export const habitEntrySchema = z.object({
  habitId: z.uuid(),
  date: dayStringSchema,
  value: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type HabitEntryDto = z.infer<typeof habitEntrySchema>;

// --- Запросы ---

/** targetValue обязателен для type='number' и запрещён для 'check'. */
export const createHabitSchema = z
  .object({
    name: nameSchema,
    type: habitTypeSchema.default("check"),
    targetValue: z.number().int().min(1).max(1000).optional(),
    daysOfWeek: daysOfWeekSchema.optional(),
    color: habitColorSchema.optional(),
  })
  .refine((dto) => dto.type !== "number" || dto.targetValue !== undefined, {
    message: "Для числовой привычки нужна цель на день",
    path: ["targetValue"],
  })
  .refine((dto) => dto.type !== "check" || dto.targetValue === undefined, {
    message: "Цель имеет смысл только у числовой привычки",
    path: ["targetValue"],
  });

export type CreateHabitDto = z.input<typeof createHabitSchema>;

/**
 * position — целевой индекс среди привычек пользователя (перенумерация шагом 1024);
 * archived: true — в архив, false — вернуть.
 */
export const patchHabitSchema = z
  .object({
    name: nameSchema.optional(),
    type: habitTypeSchema.optional(),
    targetValue: z.number().int().min(1).max(1000).nullable().optional(),
    daysOfWeek: daysOfWeekSchema.optional(),
    color: habitColorSchema.optional(),
    position: z.number().int().min(0).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchHabitDto = z.infer<typeof patchHabitSchema>;

/** Тело PUT /v1/habits/:id/entries/:date. Границы по типу проверяет сервис. */
export const setHabitEntrySchema = z.object({
  value: z.number().int().min(0).max(2000),
});

export type SetHabitEntryDto = z.infer<typeof setHabitEntrySchema>;
