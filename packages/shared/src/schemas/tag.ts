import { z } from "zod";

/** Имя тега: 1..50 символов; уникальность в рамках пользователя по lower(name). */
export const tagNameSchema = z.string().trim().min(1, "Имя тега не может быть пустым").max(50);

const nameSchema = tagNameSchema;

// --- DTO ---

export const tagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  position: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type TagDto = z.infer<typeof tagSchema>;

/** Тег на задаче (поле tags в TaskDto). */
export const taskTagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export type TaskTagDto = z.infer<typeof taskTagSchema>;

// --- Запросы ---

/**
 * position — целевой индекс (0-based) среди тегов пользователя;
 * сервер перенумеровывает остальных с шагом 1024.
 */
export const patchTagSchema = z
  .object({
    name: nameSchema.optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchTagDto = z.infer<typeof patchTagSchema>;

// --- Массовые операции ---

export const BATCH_ACTIONS = ["complete", "trash", "restore", "move"] as const;

export type BatchAction = (typeof BATCH_ACTIONS)[number];

/**
 * POST /v1/tasks/batch. Чужие и несуществующие taskIds молча пропускаются
 * (массовая семантика). Для move обязателен listId; sectionId — null = без секции.
 */
export const batchTasksSchema = z
  .object({
    taskIds: z.array(z.uuid()).min(1, "Нужен хотя бы один id").max(100),
    action: z.enum(BATCH_ACTIONS),
    listId: z.uuid().optional(),
    sectionId: z.uuid().nullable().optional(),
  })
  .refine((dto) => dto.action !== "move" || dto.listId !== undefined, {
    message: "move требует listId",
    path: ["listId"],
  });

export type BatchTasksDto = z.infer<typeof batchTasksSchema>;

/** Ответ POST /v1/tasks/batch: число задач, к которым применили действие. */
export const batchResultSchema = z.object({
  updated: z.number().int(),
});

export type BatchResultDto = z.infer<typeof batchResultSchema>;
