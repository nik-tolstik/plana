import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PatchSectionDto, SectionDto } from "@plana/shared";
import { and, eq, isNull } from "drizzle-orm";
import { insertAtPosition } from "../../common/positioning";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { lists, sections } from "../../db/schema";
import { toSectionDto } from "../lists/lists.service";

@Injectable()
export class SectionsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Секция по id с проверкой владельца через список (корзина списка = 404). */
  async findOwned(userId: string, sectionId: string) {
    const [row] = await this.db
      .select({ section: sections })
      .from(sections)
      .innerJoin(lists, eq(sections.listId, lists.id))
      .where(and(eq(sections.id, sectionId), eq(lists.userId, userId), isNull(lists.trashedAt)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ description: "Секция не найдена" });
    }
    return row.section;
  }

  async update(userId: string, sectionId: string, dto: PatchSectionDto): Promise<SectionDto> {
    const section = await this.findOwned(userId, sectionId);

    if (dto.position === undefined) {
      const [updated] = await this.db
        .update(sections)
        .set({ name: dto.name ?? section.name, updatedAt: new Date() })
        .where(eq(sections.id, sectionId))
        .returning();
      return toSectionDto(updated!);
    }

    const requestedPosition = dto.position;
    return this.db.transaction(async (tx) => {
      await insertAtPosition(
        tx,
        sections,
        eq(sections.listId, section.listId),
        sectionId,
        requestedPosition,
      );
      const [updated] = await tx
        .update(sections)
        .set({ name: dto.name ?? section.name, updatedAt: new Date() })
        .where(eq(sections.id, sectionId))
        .returning();
      return toSectionDto(updated!);
    });
  }

  /** Задачи секции остаются в списке без секции (FK ON DELETE SET NULL). */
  async remove(userId: string, sectionId: string): Promise<void> {
    await this.findOwned(userId, sectionId);
    await this.db.delete(sections).where(eq(sections.id, sectionId));
  }
}
