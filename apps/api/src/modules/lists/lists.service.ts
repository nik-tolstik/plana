import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateListDto,
  ListDto,
  PatchListDto,
  SectionDto,
  CreateSectionDto,
} from "@plana/shared";
import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { folders, lists, sections, tasks } from "../../db/schema";

export type ListRow = typeof lists.$inferSelect;

/** Шаг между соседними позициями (см. docs/architecture/erd.md — position шаг 1024). */
export const POSITION_STEP = 1024;

export function toListDto(row: ListRow): ListDto {
  return {
    id: row.id,
    folderId: row.folderId,
    name: row.name,
    // Колонка text, реестр значений — палитра из @plana/shared (пишем только через схемы).
    color: row.color as ListDto["color"],
    emoji: row.emoji,
    kind: row.kind,
    position: row.position,
    trashedAt: row.trashedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ListsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Список владельца; чужой или удалённый в корзину = 404 (не раскрываем существование). */
  async findOwned(userId: string, listId: string): Promise<ListRow> {
    const [list] = await this.db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId), isNull(lists.trashedAt)))
      .limit(1);
    if (!list) {
      throw new NotFoundException({ description: "Список не найден" });
    }
    return list;
  }

  private containerCondition(folderId: string | null) {
    return folderId === null ? isNull(lists.folderId) : eq(lists.folderId, folderId);
  }

  private async nextPosition(userId: string, folderId: string | null): Promise<number> {
    const [last] = await this.db
      .select({ position: lists.position })
      .from(lists)
      .where(
        and(eq(lists.userId, userId), this.containerCondition(folderId), isNull(lists.trashedAt)),
      )
      .orderBy(desc(lists.position))
      .limit(1);
    return (last?.position ?? -POSITION_STEP) + POSITION_STEP;
  }

  async create(userId: string, dto: CreateListDto): Promise<ListDto> {
    let folderId: string | null = null;
    if (dto.folderId !== undefined && dto.folderId !== null) {
      const [folder] = await this.db
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, dto.folderId), eq(folders.userId, userId)))
        .limit(1);
      if (!folder) {
        throw new NotFoundException({ description: "Папка не найдена" });
      }
      folderId = folder.id;
    }
    const position = await this.nextPosition(userId, folderId);
    const [created] = await this.db
      .insert(lists)
      .values({
        userId,
        folderId,
        name: dto.name,
        color: dto.color ?? "gray",
        emoji: dto.emoji ?? null,
        position,
      })
      .returning();
    if (!created) {
      throw new Error("Не удалось создать список");
    }
    return toListDto(created);
  }

  async update(userId: string, listId: string, dto: PatchListDto): Promise<ListDto> {
    const list = await this.findOwned(userId, listId);
    if (list.kind === "inbox") {
      if (dto.name !== undefined) {
        throw new ConflictException({ description: "Inbox нельзя переименовать" });
      }
      if (dto.folderId !== null && dto.folderId !== undefined) {
        throw new ConflictException({ description: "Inbox нельзя перенести в папку" });
      }
    }

    let folderId = list.folderId;
    if (dto.folderId !== undefined) {
      folderId = dto.folderId;
      if (folderId !== null) {
        const [folder] = await this.db
          .select({ id: folders.id })
          .from(folders)
          .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
          .limit(1);
        if (!folder) {
          throw new NotFoundException({ description: "Папка не найдена" });
        }
      }
    }

    const values: Partial<typeof lists.$inferInsert> = { folderId, updatedAt: new Date() };
    if (dto.name !== undefined) {
      values.name = dto.name;
    }
    if (dto.color !== undefined) {
      values.color = dto.color;
    }
    if (dto.emoji !== undefined) {
      values.emoji = dto.emoji;
    }

    const containerChanged = folderId !== list.folderId;
    if (dto.position === undefined && !containerChanged) {
      const [updated] = await this.db
        .update(lists)
        .set(values)
        .where(eq(lists.id, listId))
        .returning();
      return toListDto(updated!);
    }

    // Перенумеровываем соседей в целевом контейнере; position = целевой индекс.
    const requestedPosition = dto.position;
    return this.db.transaction(async (tx) => {
      const siblings = await tx
        .select({ id: lists.id, position: lists.position })
        .from(lists)
        .where(
          and(
            eq(lists.userId, userId),
            this.containerCondition(folderId),
            isNull(lists.trashedAt),
            ne(lists.id, listId),
          ),
        )
        .orderBy(asc(lists.position), asc(lists.createdAt));

      const index =
        requestedPosition === undefined
          ? siblings.length
          : Math.min(requestedPosition, siblings.length);
      siblings.splice(index, 0, { id: listId, position: -1 });
      for (const [i, sibling] of siblings.entries()) {
        const position = i * POSITION_STEP;
        if (sibling.position !== position) {
          await tx.update(lists).set({ position }).where(eq(lists.id, sibling.id));
        }
      }

      const [updated] = await tx.update(lists).set(values).where(eq(lists.id, listId)).returning();
      return toListDto(updated!);
    });
  }

  /** Список и его задачи уходят в корзину. Inbox удалить нельзя. */
  async trash(userId: string, listId: string): Promise<void> {
    const list = await this.findOwned(userId, listId);
    if (list.kind === "inbox") {
      throw new ConflictException({ description: "Inbox нельзя удалить" });
    }
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx.update(lists).set({ trashedAt: now }).where(eq(lists.id, listId));
      // Задачи, уже лежавшие в корзине по отдельности, сохраняют свою отметку.
      await tx
        .update(tasks)
        .set({ trashedAt: now })
        .where(and(eq(tasks.listId, listId), isNull(tasks.trashedAt)));
    });
  }

  async restore(userId: string, listId: string): Promise<ListDto> {
    const [list] = await this.db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
      .limit(1);
    if (!list || list.trashedAt === null) {
      throw new NotFoundException({ description: "Список в корзине не найден" });
    }
    const restored = await this.db.transaction(async (tx) => {
      await tx.update(tasks).set({ trashedAt: null }).where(eq(tasks.listId, listId));
      const [row] = await tx
        .update(lists)
        .set({ trashedAt: null, updatedAt: new Date() })
        .where(eq(lists.id, listId))
        .returning();
      return row!;
    });
    return toListDto(restored);
  }

  async createSection(userId: string, listId: string, dto: CreateSectionDto): Promise<SectionDto> {
    await this.findOwned(userId, listId);
    const [last] = await this.db
      .select({ position: sections.position })
      .from(sections)
      .where(eq(sections.listId, listId))
      .orderBy(desc(sections.position))
      .limit(1);
    const [created] = await this.db
      .insert(sections)
      .values({
        listId,
        name: dto.name,
        position: (last?.position ?? -POSITION_STEP) + POSITION_STEP,
      })
      .returning();
    return toSectionDto(created!);
  }
}

export type SectionRow = typeof sections.$inferSelect;

export function toSectionDto(row: SectionRow): SectionDto {
  return {
    id: row.id,
    listId: row.listId,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
