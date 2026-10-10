import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateSubtaskDto,
  CreateTaskDto,
  ParsedQuickAddDto,
  PatchSubtaskDto,
  PatchTaskDto,
  SubtaskDto,
  TaskDto,
  TaskListDto,
  TasksQuery,
} from "@plana/shared";
import { addDays, parseQuickAdd, todayInZone } from "@plana/shared";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { lists, sections, subtasks, tasks, users } from "../../db/schema";
import { POSITION_STEP } from "../lists/lists.service";

export type TaskRow = typeof tasks.$inferSelect;
export type SubtaskRow = typeof subtasks.$inferSelect;

export function toTaskDto(row: TaskRow, taskSubtasks: SubtaskRow[]): TaskDto {
  return {
    id: row.id,
    listId: row.listId,
    sectionId: row.sectionId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.dueDate,
    dueTime: row.dueTime,
    pinned: row.pinned,
    position: row.position,
    completedAt: row.completedAt?.toISOString() ?? null,
    trashedAt: row.trashedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subtasks: taskSubtasks.map(toSubtaskDto),
  };
}

export function toSubtaskDto(row: SubtaskRow): SubtaskDto {
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    done: row.done,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Задача владельца вне корзины; чужая или удалённая = 404. */
  async findOwned(userId: string, taskId: string): Promise<TaskRow> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.trashedAt)))
      .limit(1);
    if (!task) {
      throw new NotFoundException({ description: "Задача не найдена" });
    }
    return task;
  }

  private async findOwnedTrashed(userId: string, taskId: string): Promise<TaskRow> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNotNull(tasks.trashedAt)))
      .limit(1);
    if (!task) {
      throw new NotFoundException({ description: "Задача в корзине не найдена" });
    }
    return task;
  }

  private async getTimezone(userId: string): Promise<string> {
    const [row] = await this.db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.timezone ?? "UTC";
  }

  private async findInboxListId(userId: string): Promise<string> {
    const [inbox] = await this.db
      .select({ id: lists.id })
      .from(lists)
      .where(and(eq(lists.userId, userId), eq(lists.kind, "inbox"), isNull(lists.trashedAt)))
      .limit(1);
    if (!inbox) {
      throw new NotFoundException({ description: "Inbox не найден" });
    }
    return inbox.id;
  }

  /** Секция владельца в указанном списке; чужая = 404, из другого списка = 400. */
  private async assertSectionInList(
    userId: string,
    sectionId: string,
    listId: string,
  ): Promise<void> {
    const [section] = await this.db
      .select({ listId: sections.listId })
      .from(sections)
      .innerJoin(lists, eq(lists.id, sections.listId))
      .where(and(eq(sections.id, sectionId), eq(lists.userId, userId)))
      .limit(1);
    if (!section) {
      throw new NotFoundException({ description: "Секция не найдена" });
    }
    if (section.listId !== listId) {
      throw new BadRequestException({ description: "Секция принадлежит другому списку" });
    }
  }

  private containerCondition(listId: string, sectionId: string | null) {
    return and(
      eq(tasks.listId, listId),
      sectionId === null ? isNull(tasks.sectionId) : eq(tasks.sectionId, sectionId),
    );
  }

  private async nextPosition(listId: string, sectionId: string | null): Promise<number> {
    const [last] = await this.db
      .select({ position: tasks.position })
      .from(tasks)
      .where(and(this.containerCondition(listId, sectionId), isNull(tasks.trashedAt)))
      .orderBy(desc(tasks.position))
      .limit(1);
    return (last?.position ?? -POSITION_STEP) + POSITION_STEP;
  }

  async create(userId: string, dto: CreateTaskDto): Promise<TaskDto> {
    const listId = dto.listId ?? (await this.findInboxListId(userId));
    await this.assertListOwned(userId, listId);
    const sectionId = dto.sectionId ?? null;
    if (sectionId !== null) {
      await this.assertSectionInList(userId, sectionId, listId);
    }
    const position = await this.nextPosition(listId, sectionId);
    const [created] = await this.db
      .insert(tasks)
      .values({
        userId,
        listId,
        sectionId,
        title: dto.title,
        description: dto.description ?? "",
        priority: dto.priority ?? "none",
        dueDate: dto.dueDate ?? null,
        dueTime: dto.dueTime ?? null,
        pinned: dto.pinned ?? false,
        position,
      })
      .returning();
    return toTaskDto(created!, []);
  }

  async findOne(userId: string, taskId: string): Promise<TaskDto> {
    const task = await this.findOwned(userId, taskId);
    const rows = await this.db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId))
      .orderBy(asc(subtasks.position));
    return toTaskDto(task, rows);
  }

  async findMany(userId: string, query: TasksQuery): Promise<TaskListDto> {
    const base = and(eq(tasks.userId, userId));
    let where = base;
    let orderBy = [desc(tasks.pinned), asc(tasks.dueDate), asc(tasks.createdAt)];

    if (query.listId !== undefined) {
      await this.assertListOwned(userId, query.listId);
      where = and(
        where,
        eq(tasks.listId, query.listId),
        isNull(tasks.trashedAt),
        isNull(tasks.completedAt),
      );
      orderBy = [sql`${tasks.sectionId} nulls last`, asc(tasks.position)];
    } else {
      const smart = query.smart ?? "all";
      const timezone = await this.getTimezone(userId);
      const now = new Date();
      const today = todayInZone(now, timezone);
      switch (smart) {
        case "inbox":
          where = and(
            where,
            eq(tasks.listId, await this.findInboxListId(userId)),
            isNull(tasks.trashedAt),
            isNull(tasks.completedAt),
          );
          break;
        case "today":
          // Просроченные попадают в «Сегодня» (поведение TickTick).
          where = and(
            where,
            isNotNull(tasks.dueDate),
            lte(tasks.dueDate, today),
            isNull(tasks.trashedAt),
            isNull(tasks.completedAt),
          );
          break;
        case "tomorrow":
          where = and(
            where,
            eq(tasks.dueDate, addDays(today, 1)),
            isNull(tasks.trashedAt),
            isNull(tasks.completedAt),
          );
          break;
        case "next7":
          where = and(
            where,
            isNotNull(tasks.dueDate),
            gte(tasks.dueDate, today),
            lte(tasks.dueDate, addDays(today, 7)),
            isNull(tasks.trashedAt),
            isNull(tasks.completedAt),
          );
          break;
        case "all":
          where = and(where, isNull(tasks.trashedAt), isNull(tasks.completedAt));
          break;
        case "completed":
          where = and(where, isNotNull(tasks.completedAt), isNull(tasks.trashedAt));
          orderBy = [desc(tasks.completedAt)];
          break;
        case "trash":
          where = and(where, isNotNull(tasks.trashedAt));
          orderBy = [desc(tasks.trashedAt)];
          break;
      }
    }

    const rows = await this.db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(...orderBy)
      .limit(query.limit)
      .offset(query.offset);

    const [{ value: total } = { value: 0 }] = await this.db
      .select({ value: count() })
      .from(tasks)
      .where(where);

    const ids = rows.map((row) => row.id);
    const subtaskRows = ids.length
      ? await this.db
          .select()
          .from(subtasks)
          .where(inArray(subtasks.taskId, ids))
          .orderBy(asc(subtasks.position))
      : [];
    const byTask = new Map<string, SubtaskRow[]>();
    for (const subtask of subtaskRows) {
      const list = byTask.get(subtask.taskId) ?? [];
      list.push(subtask);
      byTask.set(subtask.taskId, list);
    }

    return { items: rows.map((row) => toTaskDto(row, byTask.get(row.id) ?? [])), total };
  }

  async update(userId: string, taskId: string, dto: PatchTaskDto): Promise<TaskDto> {
    const task = await this.findOwned(userId, taskId);

    const listId = dto.listId ?? task.listId;
    if (dto.listId !== undefined && dto.listId !== task.listId) {
      await this.assertListOwned(userId, listId);
    }

    const sectionId = dto.sectionId !== undefined ? dto.sectionId : task.sectionId;
    if (dto.sectionId !== undefined && sectionId !== null) {
      await this.assertSectionInList(userId, sectionId, listId);
    }

    // После слияния с текущими значениями время должно остаться с датой.
    const dueDate = dto.dueDate !== undefined ? dto.dueDate : task.dueDate;
    const dueTime = dto.dueTime !== undefined ? dto.dueTime : task.dueTime;
    if (dueTime !== null && dueDate === null) {
      throw new BadRequestException({ description: "Время имеет смысл только вместе с датой" });
    }

    const values: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
    if (dto.title !== undefined) values.title = dto.title;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.priority !== undefined) values.priority = dto.priority;
    if (dto.dueDate !== undefined) values.dueDate = dto.dueDate;
    if (dto.dueTime !== undefined) values.dueTime = dto.dueTime;
    if (dto.pinned !== undefined) values.pinned = dto.pinned;
    if (dto.listId !== undefined) values.listId = listId;
    if (dto.sectionId !== undefined) values.sectionId = sectionId;

    const containerChanged = listId !== task.listId || sectionId !== task.sectionId;
    const requestedPosition = dto.position;

    if (requestedPosition === undefined && !containerChanged) {
      const [updated] = await this.db
        .update(tasks)
        .set(values)
        .where(eq(tasks.id, taskId))
        .returning();
      return this.attachSubtasks(updated!);
    }

    // Перенумеровываем соседей целевого контейнера; position = целевой индекс.
    return this.db.transaction(async (tx) => {
      const siblings = await tx
        .select({ id: tasks.id, position: tasks.position })
        .from(tasks)
        .where(
          and(
            this.containerCondition(listId, sectionId),
            isNull(tasks.trashedAt),
            ne(tasks.id, taskId),
          ),
        )
        .orderBy(asc(tasks.position), asc(tasks.createdAt));

      const index =
        requestedPosition === undefined
          ? siblings.length
          : Math.min(requestedPosition, siblings.length);
      siblings.splice(index, 0, { id: taskId, position: -1 });
      for (const [i, sibling] of siblings.entries()) {
        const position = i * POSITION_STEP;
        if (sibling.position !== position) {
          await tx.update(tasks).set({ position }).where(eq(tasks.id, sibling.id));
        }
      }

      const [updated] = await tx.update(tasks).set(values).where(eq(tasks.id, taskId)).returning();
      return this.attachSubtasks(updated!);
    });
  }

  private async attachSubtasks(row: TaskRow): Promise<TaskDto> {
    const rows = await this.db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, row.id))
      .orderBy(asc(subtasks.position));
    return toTaskDto(row, rows);
  }

  /** Список должен существовать и принадлежать пользователю (404 иначе). */
  private async assertListOwned(userId: string, listId: string): Promise<void> {
    const [list] = await this.db
      .select({ id: lists.id })
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId), isNull(lists.trashedAt)))
      .limit(1);
    if (!list) {
      throw new NotFoundException({ description: "Список не найден" });
    }
  }

  async complete(userId: string, taskId: string): Promise<TaskDto> {
    const task = await this.findOwned(userId, taskId);
    if (task.completedAt !== null) {
      return this.attachSubtasks(task);
    }
    const [updated] = await this.db
      .update(tasks)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return this.attachSubtasks(updated!);
  }

  async uncomplete(userId: string, taskId: string): Promise<TaskDto> {
    const task = await this.findOwned(userId, taskId);
    if (task.completedAt === null) {
      return this.attachSubtasks(task);
    }
    const [updated] = await this.db
      .update(tasks)
      .set({ completedAt: null, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return this.attachSubtasks(updated!);
  }

  async trash(userId: string, taskId: string): Promise<void> {
    const task = await this.findOwned(userId, taskId);
    await this.db.update(tasks).set({ trashedAt: new Date() }).where(eq(tasks.id, task.id));
  }

  /** Физическое удаление (каскад подзадач, тегов-связей, напоминаний). */
  async purge(userId: string, taskId: string): Promise<void> {
    // Доступно и для задачи в корзине, и вне её.
    const [row] = await this.db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ description: "Задача не найдена" });
    }
    await this.db.delete(tasks).where(eq(tasks.id, row.id));
  }

  async restore(userId: string, taskId: string): Promise<TaskDto> {
    const task = await this.findOwnedTrashed(userId, taskId);
    const [updated] = await this.db
      .update(tasks)
      .set({ trashedAt: null, updatedAt: new Date() })
      .where(eq(tasks.id, task.id))
      .returning();
    return this.attachSubtasks(updated!);
  }

  /** NLP-разбор quick-add; ничего не создаёт (docs/architecture/api.md). */
  async parse(userId: string, text: string): Promise<ParsedQuickAddDto> {
    const timezone = await this.getTimezone(userId);
    return parseQuickAdd(text, { now: new Date(), timeZone: timezone });
  }

  // --- Подзадачи ---

  async createSubtask(userId: string, taskId: string, dto: CreateSubtaskDto): Promise<SubtaskDto> {
    await this.findOwned(userId, taskId);
    const [last] = await this.db
      .select({ position: subtasks.position })
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId))
      .orderBy(desc(subtasks.position))
      .limit(1);
    const [created] = await this.db
      .insert(subtasks)
      .values({
        taskId,
        title: dto.title,
        position: (last?.position ?? -POSITION_STEP) + POSITION_STEP,
      })
      .returning();
    return toSubtaskDto(created!);
  }

  async updateSubtask(
    userId: string,
    subtaskId: string,
    dto: PatchSubtaskDto,
  ): Promise<SubtaskDto> {
    const subtask = await this.findOwnedSubtask(userId, subtaskId);
    const values: Partial<typeof subtasks.$inferInsert> = { updatedAt: new Date() };
    if (dto.title !== undefined) values.title = dto.title;
    if (dto.done !== undefined) values.done = dto.done;

    const requestedPosition = dto.position;
    if (requestedPosition === undefined) {
      const [updated] = await this.db
        .update(subtasks)
        .set(values)
        .where(eq(subtasks.id, subtaskId))
        .returning();
      return toSubtaskDto(updated!);
    }

    return this.db.transaction(async (tx) => {
      const siblings = await tx
        .select({ id: subtasks.id, position: subtasks.position })
        .from(subtasks)
        .where(and(eq(subtasks.taskId, subtask.taskId), ne(subtasks.id, subtaskId)))
        .orderBy(asc(subtasks.position), asc(subtasks.createdAt));
      const index = Math.min(requestedPosition, siblings.length);
      siblings.splice(index, 0, { id: subtaskId, position: -1 });
      for (const [i, sibling] of siblings.entries()) {
        const position = i * POSITION_STEP;
        if (sibling.position !== position) {
          await tx.update(subtasks).set({ position }).where(eq(subtasks.id, sibling.id));
        }
      }
      const [updated] = await tx
        .update(subtasks)
        .set(values)
        .where(eq(subtasks.id, subtaskId))
        .returning();
      return toSubtaskDto(updated!);
    });
  }

  async removeSubtask(userId: string, subtaskId: string): Promise<void> {
    const subtask = await this.findOwnedSubtask(userId, subtaskId);
    await this.db.delete(subtasks).where(eq(subtasks.id, subtask.id));
  }

  private async findOwnedSubtask(userId: string, subtaskId: string): Promise<SubtaskRow> {
    const [row] = await this.db
      .select({ subtask: subtasks })
      .from(subtasks)
      .innerJoin(tasks, eq(tasks.id, subtasks.taskId))
      .where(and(eq(subtasks.id, subtaskId), eq(tasks.userId, userId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ description: "Подзадача не найдена" });
    }
    return row.subtask;
  }
}
