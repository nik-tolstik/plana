import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateListDto,
  ListDto,
  PatchListDto,
  SectionDto,
  CreateSectionDto,
} from "@plana/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { insertAtPosition, nextPosition } from "../../common/positioning";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { folders, lists, sections, tasks } from "../../db/schema";

export type ListRow = typeof lists.$inferSelect;

export function toListDto(row: ListRow): ListDto {
  return {
    id: row.id,
    folderId: row.folderId,
    name: row.name,
    // Колонки text, реестр значений — палитра из @plana/shared (пишем только через схемы).
    color: row.color as ListDto["color"],
    icon: (row.icon as ListDto["icon"]) ?? null,
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

  private listContainer(userId: string, folderId: string | null) {
    return and(
      eq(lists.userId, userId),
      this.containerCondition(folderId),
      isNull(lists.trashedAt),
    );
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
    const position = await nextPosition(this.db, lists, this.listContainer(userId, folderId));
    const [created] = await this.db
      .insert(lists)
      .values({
        userId,
        folderId,
        name: dto.name,
        color: dto.color ?? "gray",
        icon: dto.icon ?? null,
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
    if (dto.icon !== undefined) {
      values.icon = dto.icon;
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
      await insertAtPosition(
        tx,
        lists,
        this.listContainer(userId, folderId),
        listId,
        requestedPosition,
      );
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
    const listTrashedAt = list.trashedAt;
    const restored = await this.db.transaction(async (tx) => {
      // Возвращаем только задачи, унесённые в корзину вместе со списком
      // (их trashedAt совпадает с отметкой списка — ставились одним now());
      // задачи, trashed-нутые по отдельности до этого, остаются в корзине.
      await tx
        .update(tasks)
        .set({ trashedAt: null, updatedAt: new Date() })
        .where(and(eq(tasks.listId, listId), eq(tasks.trashedAt, listTrashedAt)));
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
    const [created] = await this.db
      .insert(sections)
      .values({
        listId,
        name: dto.name,
        position: await nextPosition(this.db, sections, eq(sections.listId, listId)),
      })
      .returning();
    return toSectionDto(created!);
  }

  async listSections(userId: string, listId: string): Promise<SectionDto[]> {
    await this.findOwned(userId, listId);
    return (
      await this.db
        .select()
        .from(sections)
        .where(eq(sections.listId, listId))
        .orderBy(asc(sections.position))
    ).map(toSectionDto);
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
