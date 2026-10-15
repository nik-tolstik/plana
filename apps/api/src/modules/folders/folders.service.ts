import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateFolderDto, FolderDto, PatchFolderDto, SidebarDto } from "@plana/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { insertAtPosition, nextPosition } from "../../common/positioning";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { folders, lists } from "../../db/schema";
import { toListDto } from "../lists/lists.service";

export type FolderRow = typeof folders.$inferSelect;

export function toFolderDto(row: FolderRow): FolderDto {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class FoldersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findOwned(userId: string, folderId: string): Promise<FolderRow> {
    const [folder] = await this.db
      .select()
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .limit(1);
    if (!folder) {
      throw new NotFoundException({ description: "Папка не найдена" });
    }
    return folder;
  }

  /** Всё дерево левого сайдбара за один round-trip к клиенту (2 запроса к БД). */
  async getSidebar(userId: string): Promise<SidebarDto> {
    const [folderRows, listRows] = await Promise.all([
      this.db
        .select()
        .from(folders)
        .where(eq(folders.userId, userId))
        .orderBy(asc(folders.position), asc(folders.createdAt)),
      this.db
        .select()
        .from(lists)
        .where(and(eq(lists.userId, userId), isNull(lists.trashedAt)))
        .orderBy(asc(lists.position), asc(lists.createdAt)),
    ]);

    // Inbox создаётся при регистрации (users.createWithInbox) и не удаляется.
    const inbox = listRows.find((row) => row.kind === "inbox");
    if (!inbox) {
      throw new Error(`Inbox не найден у пользователя ${userId}`);
    }

    const visible = listRows.filter((row) => row.kind === "regular");
    const byFolder = new Map<string | null, typeof visible>();
    for (const row of visible) {
      const bucket = byFolder.get(row.folderId) ?? [];
      bucket.push(row);
      byFolder.set(row.folderId, bucket);
    }

    return {
      inbox: toListDto(inbox),
      rootLists: (byFolder.get(null) ?? []).map(toListDto),
      folders: folderRows.map((folder) => ({
        ...toFolderDto(folder),
        lists: (byFolder.get(folder.id) ?? []).map(toListDto),
      })),
    };
  }

  async create(userId: string, dto: CreateFolderDto): Promise<FolderDto> {
    const [created] = await this.db
      .insert(folders)
      .values({
        userId,
        name: dto.name,
        position: await nextPosition(this.db, folders, eq(folders.userId, userId)),
      })
      .returning();
    if (!created) {
      throw new Error("Не удалось создать папку");
    }
    return toFolderDto(created);
  }

  async update(userId: string, folderId: string, dto: PatchFolderDto): Promise<FolderDto> {
    const folder = await this.findOwned(userId, folderId);

    if (dto.position === undefined) {
      const [updated] = await this.db
        .update(folders)
        .set({ name: dto.name ?? folder.name, updatedAt: new Date() })
        .where(eq(folders.id, folderId))
        .returning();
      return toFolderDto(updated!);
    }

    // position = целевой индекс среди папок пользователя, перенумеровываем соседей.
    const requestedPosition = dto.position;
    return this.db.transaction(async (tx) => {
      await insertAtPosition(tx, folders, eq(folders.userId, userId), folderId, requestedPosition);
      const [updated] = await tx
        .update(folders)
        .set({ name: dto.name ?? folder.name, updatedAt: new Date() })
        .where(eq(folders.id, folderId))
        .returning();
      return toFolderDto(updated!);
    });
  }

  /** Папка удаляется, её списки остаются и выходят в корень (FK ON DELETE SET NULL). */
  async remove(userId: string, folderId: string): Promise<void> {
    await this.findOwned(userId, folderId);
    await this.db.delete(folders).where(eq(folders.id, folderId));
  }
}
