import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateTagDto, PatchTagDto, TagDto } from "@plana/shared";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { insertAtPosition, nextPosition } from "../../common/positioning";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { tags } from "../../db/schema";

export type TagRow = typeof tags.$inferSelect;

export function toTagDto(row: TagRow): TagDto {
  return {
    id: row.id,
    name: row.name,
    // Колонки text, реестр значений — палитры из @plana/shared.
    color: row.color as TagDto["color"],
    icon: (row.icon as TagDto["icon"]) ?? null,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class TagsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findOwned(userId: string, tagId: string): Promise<TagRow> {
    const [tag] = await this.db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1);
    if (!tag) {
      throw new NotFoundException({ description: "Тег не найден" });
    }
    return tag;
  }

  async findAll(userId: string): Promise<TagDto[]> {
    const rows = await this.db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(asc(tags.position));
    return rows.map(toTagDto);
  }

  /** Создание тега (интерфейс тегов в сайдбаре); имя уникально по lower(name). */
  async create(userId: string, dto: CreateTagDto): Promise<TagDto> {
    const [clash] = await this.db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, userId), sql`lower(${tags.name}) = lower(${dto.name})`))
      .limit(1);
    if (clash) {
      throw new ConflictException({ description: "Тег с таким именем уже есть" });
    }
    const [row] = await this.db
      .insert(tags)
      .values({
        userId,
        name: dto.name,
        color: dto.color ?? "gray",
        icon: dto.icon ?? null,
        position: await nextPosition(this.db, tags, eq(tags.userId, userId)),
      })
      .returning();
    return toTagDto(row!);
  }

  async update(userId: string, tagId: string, dto: PatchTagDto): Promise<TagDto> {
    const tag = await this.findOwned(userId, tagId);

    if (dto.name !== undefined && dto.name !== tag.name) {
      // Уникальность имён в рамках пользователя — по lower(name). Смена регистра
      // («дизайн» → «Дизайн») не конфликтует с самим тегом — исключаем его.
      const [clash] = await this.db
        .select({ id: tags.id })
        .from(tags)
        .where(
          and(
            eq(tags.userId, userId),
            sql`lower(${tags.name}) = lower(${dto.name})`,
            ne(tags.id, tagId),
          ),
        )
        .limit(1);
      if (clash) {
        throw new ConflictException({ description: "Тег с таким именем уже есть" });
      }
    }

    const values: Partial<typeof tags.$inferInsert> = { updatedAt: new Date() };
    if (dto.name !== undefined) values.name = dto.name;
    if (dto.color !== undefined) values.color = dto.color;
    if (dto.icon !== undefined) values.icon = dto.icon;

    if (dto.position === undefined) {
      const [updated] = await this.db
        .update(tags)
        .set(values)
        .where(eq(tags.id, tagId))
        .returning();
      return toTagDto(updated!);
    }

    // position — целевой индекс среди тегов пользователя; перенумерация шагом 1024.
    const requestedPosition = dto.position;
    const [updated] = await this.db.transaction(async (tx) => {
      await insertAtPosition(tx, tags, eq(tags.userId, userId), tagId, requestedPosition);
      return tx.update(tags).set(values).where(eq(tags.id, tagId)).returning();
    });
    return toTagDto(updated!);
  }

  /** Физическое удаление; связи с задачами снимаются каскадом (FK). */
  async remove(userId: string, tagId: string): Promise<void> {
    const tag = await this.findOwned(userId, tagId);
    await this.db.delete(tags).where(eq(tags.id, tag.id));
  }
}
