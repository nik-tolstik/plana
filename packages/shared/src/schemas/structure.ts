import { z } from "zod";

/** Ключи палитры цветов списка. Фронтенд мапит их в свои CSS-цвета. */
export const LIST_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const;

export const listColorSchema = z.enum(LIST_COLORS);

export type ListColor = z.infer<typeof listColorSchema>;

const nameSchema = z.string().trim().min(1, "Название не может быть пустым").max(100);

// Один эмодзи-символ (по UTF-16 юнитам до 8 — покрывает любые эмодзи с модификаторами).
const emojiSchema = z.string().trim().min(1).max(8);

// --- DTO ---

export const folderSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  position: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type FolderDto = z.infer<typeof folderSchema>;

export const listSchema = z.object({
  id: z.uuid(),
  folderId: z.uuid().nullable(),
  name: z.string(),
  color: listColorSchema,
  emoji: z.string().nullable(),
  kind: z.enum(["inbox", "regular"]),
  position: z.number().int(),
  trashedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ListDto = z.infer<typeof listSchema>;

export const sectionSchema = z.object({
  id: z.uuid(),
  listId: z.uuid(),
  name: z.string(),
  position: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type SectionDto = z.infer<typeof sectionSchema>;

/** Ответ GET /v1/folders: всё дерево сайдбара одним запросом. */
export const sidebarDtoSchema = z.object({
  inbox: listSchema,
  rootLists: z.array(listSchema),
  folders: z.array(folderSchema.extend({ lists: z.array(listSchema) })),
});

export type SidebarDto = z.infer<typeof sidebarDtoSchema>;

// --- Запросы ---

export const createFolderSchema = z.object({
  name: nameSchema,
});

export type CreateFolderDto = z.infer<typeof createFolderSchema>;

/**
 * position — целевой индекс (0-based) среди соседей в том же контейнере;
 * сервер перенумеровывает соседей с шагом 1024 (docs/architecture/api.md).
 */
export const patchFolderSchema = z
  .object({
    name: nameSchema.optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchFolderDto = z.infer<typeof patchFolderSchema>;

export const createListSchema = z.object({
  name: nameSchema,
  color: listColorSchema.optional(),
  emoji: emojiSchema.nullable().optional(),
  folderId: z.uuid().nullable().optional(),
});

export type CreateListDto = z.infer<typeof createListSchema>;

export const patchListSchema = z
  .object({
    name: nameSchema.optional(),
    color: listColorSchema.optional(),
    emoji: emojiSchema.nullable().optional(),
    // null = вынести из папки в корень.
    folderId: z.uuid().nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchListDto = z.infer<typeof patchListSchema>;

export const createSectionSchema = z.object({
  name: nameSchema,
});

export type CreateSectionDto = z.infer<typeof createSectionSchema>;

export const patchSectionSchema = z
  .object({
    name: nameSchema.optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchSectionDto = z.infer<typeof patchSectionSchema>;
