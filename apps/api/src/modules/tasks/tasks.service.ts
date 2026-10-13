import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  BatchResultDto,
  BatchTasksDto,
  CreateSubtaskDto,
  CreateTaskDto,
  ParsedQuickAddDto,
  PatchSubtaskDto,
  PatchTaskDto,
  SubtaskDto,
  TaskDto,
  TaskListDto,
  TaskTagDto,
  TasksQuery,
} from "@plana/shared";
import {
  addDays,
  compareDays,
  nextOccurrence,
  parseQuickAdd,
  parseRrule,
  todayInZone,
} from "@plana/shared";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import {
  lists,
  sections,
  subtasks,
  taskCompletions,
  taskTags,
  tags,
  tasks,
  users,
} from "../../db/schema";
import { POSITION_STEP } from "../lists/lists.service";

export type TaskRow = typeof tasks.$inferSelect;
export type SubtaskRow = typeof subtasks.$inferSelect;
export type TagRow = typeof tags.$inferSelect;

export function toTaskDto(
  row: TaskRow,
  taskSubtasks: SubtaskRow[],
  taskTags: Array<Pick<TagRow, "id" | "name" | "color" | "icon">>,
): TaskDto {
  const dto: TaskDto = {
    id: row.id,
    listId: row.listId,
    sectionId: row.sectionId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.dueDate,
    dueTime: row.dueTime,
    rrule: row.rrule,
    rruleStartDate: row.rruleStartDate,
    pinned: row.pinned,
    position: row.position,
    completedAt: row.completedAt?.toISOString() ?? null,
    trashedAt: row.trashedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subtasks: taskSubtasks.map(toSubtaskDto),
    tags: taskTags.map<TaskTagDto>((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color as TaskTagDto["color"],
      icon: (tag.icon as TaskTagDto["icon"]) ?? null,
    })),
  };
  return dto;
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

/** Экранирует LIKE-спецсимволы (%, _, \) для ilike-поиска. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
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

  /** Позиция перед первой задачей контейнера: новые задачи встают в начало. */
  private async firstPosition(listId: string, sectionId: string | null): Promise<number> {
    const [first] = await this.db
      .select({ position: tasks.position })
      .from(tasks)
      .where(and(this.containerCondition(listId, sectionId), isNull(tasks.trashedAt)))
      .orderBy(asc(tasks.position))
      .limit(1);
    return (first?.position ?? 0) - POSITION_STEP;
  }

  /**
   * Позиция сразу после задачи-якоря в том же контейнере (список + секция).
   * Чужой якорь или другой контейнер — игнорируем, задача уходит в конец.
   */
  private async positionAfter(
    userId: string,
    listId: string,
    sectionId: string | null,
    afterTaskId: string,
  ): Promise<number | null> {
    const [after] = await this.db
      .select({ listId: tasks.listId, sectionId: tasks.sectionId, position: tasks.position })
      .from(tasks)
      .where(and(eq(tasks.id, afterTaskId), eq(tasks.userId, userId), isNull(tasks.trashedAt)))
      .limit(1);
    if (!after || after.listId !== listId || (after.sectionId ?? null) !== sectionId) {
      return null;
    }
    const [next] = await this.db
      .select({ position: tasks.position })
      .from(tasks)
      .where(
        and(
          this.containerCondition(listId, sectionId),
          isNull(tasks.trashedAt),
          gt(tasks.position, after.position),
        ),
      )
      .orderBy(asc(tasks.position))
      .limit(1);
    if (!next) {
      return after.position + POSITION_STEP;
    }
    const middle = Math.ceil((after.position + next.position) / 2);
    // Соседи стоят вплотную (шаг исчерпан) — конец надёжнее перенумерации.
    return middle > after.position ? middle : null;
  }

  async create(userId: string, dto: CreateTaskDto): Promise<TaskDto> {
    const listId = dto.listId ?? (await this.findInboxListId(userId));
    await this.assertListOwned(userId, listId);
    const sectionId = dto.sectionId ?? null;
    if (sectionId !== null) {
      await this.assertSectionInList(userId, sectionId, listId);
    }
    const position =
      dto.afterTaskId !== undefined
        ? ((await this.positionAfter(userId, listId, sectionId, dto.afterTaskId)) ??
          (await this.firstPosition(listId, sectionId)))
        : await this.firstPosition(listId, sectionId);
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
        // Схема гарантирует: rrule только вместе с dueDate (DTSTART = dueDate).
        rrule: dto.rrule ?? null,
        rruleStartDate: dto.rrule != null ? (dto.dueDate ?? null) : null,
        pinned: dto.pinned ?? false,
        position,
      })
      .returning();
    if (dto.tagNames !== undefined && dto.tagNames.length > 0) {
      await this.syncTaskTags(userId, created!.id, dto.tagNames);
    }
    return this.hydrateTask(created!);
  }

  async findOne(userId: string, taskId: string): Promise<TaskDto> {
    const task = await this.findOwned(userId, taskId);
    return this.hydrateTask(task);
  }

  async findMany(userId: string, query: TasksQuery): Promise<TaskListDto> {
    // Lazy purge: при открытии корзины физически удаляем задачи старше 30 дней.
    if ((query.smart ?? "all") === "trash") {
      await this.db
        .delete(tasks)
        .where(and(eq(tasks.userId, userId), lt(tasks.trashedAt, sql`now() - interval '30 days'`)));
    }

    const base = and(eq(tasks.userId, userId));
    let where = base;
    // position — «настоящий» порядок в списках (DnD, afterTaskId); createdAt
    // только разводит задачи с одинаковыми позициями соседних списков.
    let orderBy = [
      desc(tasks.pinned),
      asc(tasks.dueDate),
      asc(tasks.position),
      asc(tasks.createdAt),
    ];

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

    // Поиск по заголовку и описанию (ilike, спецсимволы % _ \ экранируются).
    if (query.q !== undefined) {
      const pattern = `%${escapeLike(query.q)}%`;
      where = and(where, or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)));
    }
    // Фильтр по тегу: подзапрос по task_tags. Чужой tagId просто даст пустой список.
    if (query.tagId !== undefined) {
      where = and(
        where,
        inArray(
          tasks.id,
          this.db
            .select({ taskId: taskTags.taskId })
            .from(taskTags)
            .where(eq(taskTags.tagId, query.tagId)),
        ),
      );
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

    const tagRows = ids.length
      ? await this.db
          .select({
            taskId: taskTags.taskId,
            id: tags.id,
            name: tags.name,
            color: tags.color,
            icon: tags.icon,
          })
          .from(taskTags)
          .innerJoin(tags, eq(tags.id, taskTags.tagId))
          .where(inArray(taskTags.taskId, ids))
          .orderBy(asc(tags.name))
      : [];
    const tagsByTask = new Map<
      string,
      Array<{ id: string; name: string; color: string; icon: string | null }>
    >();
    for (const tag of tagRows) {
      const list = tagsByTask.get(tag.taskId) ?? [];
      list.push({ id: tag.id, name: tag.name, color: tag.color, icon: tag.icon });
      tagsByTask.set(tag.taskId, list);
    }

    return {
      items: rows.map((row) =>
        toTaskDto(row, byTask.get(row.id) ?? [], tagsByTask.get(row.id) ?? []),
      ),
      total,
    };
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
    const rrule = dto.rrule !== undefined ? dto.rrule : task.rrule;
    if (rrule !== null && dueDate === null) {
      throw new BadRequestException({ description: "Повтор имеет смысл только вместе с датой" });
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

    // Повтор: смена правила или даты перезапускает шаблон с новой даты
    // (rruleStartDate = dueDate), история вхождений сбрасывается; снятие
    // повтора удаляет и якорь, и историю.
    const ruleChanged = dto.rrule !== undefined && dto.rrule !== task.rrule;
    const dateChanged = dto.dueDate !== undefined && dto.dueDate !== task.dueDate;
    if (ruleChanged || (task.rrule !== null && dateChanged)) {
      if (rrule === null) {
        values.rrule = null;
        values.rruleStartDate = null;
      } else {
        const reAnchor = ruleChanged || dateChanged || task.rruleStartDate === null;
        values.rrule = rrule;
        values.rruleStartDate = reAnchor ? dueDate : task.rruleStartDate;
      }
      await this.db.delete(taskCompletions).where(eq(taskCompletions.taskId, taskId));
    }

    const containerChanged = listId !== task.listId || sectionId !== task.sectionId;
    const requestedPosition = dto.position;

    if (requestedPosition === undefined && !containerChanged) {
      const [updated] = await this.db
        .update(tasks)
        .set(values)
        .where(eq(tasks.id, taskId))
        .returning();
      if (dto.tagNames !== undefined) {
        await this.syncTaskTags(userId, taskId, dto.tagNames);
      }
      return this.hydrateTask(updated!);
    }

    // Перенумеровываем соседей целевого контейнера; position = целевой индекс.
    const [updated] = await this.db.transaction(async (tx) => {
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

      return tx.update(tasks).set(values).where(eq(tasks.id, taskId)).returning();
    });
    if (dto.tagNames !== undefined) {
      await this.syncTaskTags(userId, taskId, dto.tagNames);
    }
    return this.hydrateTask(updated!);
  }

  /** Полная загрузка задачи для ответа: подзадачи + теги. */
  private async hydrateTask(row: TaskRow): Promise<TaskDto> {
    const subtaskRows = await this.db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, row.id))
      .orderBy(asc(subtasks.position));
    const tagRows = await this.db
      .select({ id: tags.id, name: tags.name, color: tags.color, icon: tags.icon })
      .from(taskTags)
      .innerJoin(tags, eq(tags.id, taskTags.tagId))
      .where(eq(taskTags.taskId, row.id))
      .orderBy(asc(tags.name));
    return toTaskDto(row, subtaskRows, tagRows);
  }

  /**
   * Полная замена тегов задачи по именам: отсутствующие теги создаются
   * (неявное создание, lower(name) уникален в рамках пользователя),
   * лишние связи снимаются. Пустой массив снимает все теги.
   */
  private async syncTaskTags(userId: string, taskId: string, names: string[]): Promise<void> {
    const tagIds: string[] = [];
    for (const name of names) {
      const [existing] = await this.db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, userId), sql`lower(${tags.name}) = lower(${name})`))
        .limit(1);
      if (existing) {
        tagIds.push(existing.id);
        continue;
      }
      const [last] = await this.db
        .select({ position: tags.position })
        .from(tags)
        .where(eq(tags.userId, userId))
        .orderBy(desc(tags.position))
        .limit(1);
      const [created] = await this.db
        .insert(tags)
        .values({ userId, name, position: (last?.position ?? -POSITION_STEP) + POSITION_STEP })
        .returning({ id: tags.id });
      tagIds.push(created!.id);
    }
    await this.db.delete(taskTags).where(eq(taskTags.taskId, taskId));
    if (tagIds.length > 0) {
      await this.db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId, tagId })));
    }
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
      return this.hydrateTask(task);
    }
    if (task.rrule !== null) {
      return this.completeOccurrence(userId, task);
    }
    const [updated] = await this.db
      .update(tasks)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return this.hydrateTask(updated!);
  }

  /**
   * Завершение вхождения повтора: запись в task_completions + сдвиг dueDate
   * на следующее вхождение. Просроченные вхождения пропускаются — следующее
   * вхождение ищется после max(dueDate, сегодня), поведение TickTick.
   * Правило исчерпано (COUNT/UNTIL) — задача закрывается обычным образом.
   * НЕ идемпотентно: каждый вызов закрывает одно вхождение.
   */
  private async completeOccurrence(userId: string, task: TaskRow): Promise<TaskDto> {
    const rule = parseRrule(task.rrule!);
    if (rule === null || task.dueDate === null || task.rruleStartDate === null) {
      // Правило валидируется схемой при записи — сюда попадаем только при
      // битых данных (например, правках напрямую в БД).
      throw new BadRequestException({ description: "Правило повтора повреждено" });
    }
    const timezone = await this.getTimezone(userId);
    const today = todayInZone(new Date(), timezone);
    const from = compareDays(task.dueDate, today) >= 0 ? task.dueDate : today;
    const next = nextOccurrence(rule, task.rruleStartDate, from);

    const [updated] = await this.db.transaction(async (tx) => {
      await tx.insert(taskCompletions).values({
        taskId: task.id,
        userId,
        occurrenceDate: task.dueDate!,
      });
      return tx
        .update(tasks)
        .set(
          next === null
            ? { completedAt: new Date(), updatedAt: new Date() }
            : { dueDate: next, updatedAt: new Date() },
        )
        .where(eq(tasks.id, task.id))
        .returning();
    });
    return this.hydrateTask(updated!);
  }

  async uncomplete(userId: string, taskId: string): Promise<TaskDto> {
    const task = await this.findOwned(userId, taskId);
    if (task.rrule !== null) {
      // Откат последнего вхождения: dueDate = закрытый день, запись истории удаляется.
      const [last] = await this.db
        .select()
        .from(taskCompletions)
        .where(eq(taskCompletions.taskId, taskId))
        .orderBy(desc(taskCompletions.completedAt))
        .limit(1);
      if (!last) {
        return this.hydrateTask(task);
      }
      const [updated] = await this.db.transaction(async (tx) => {
        await tx.delete(taskCompletions).where(eq(taskCompletions.id, last.id));
        return tx
          .update(tasks)
          .set({ dueDate: last.occurrenceDate, completedAt: null, updatedAt: new Date() })
          .where(eq(tasks.id, taskId))
          .returning();
      });
      return this.hydrateTask(updated!);
    }
    if (task.completedAt === null) {
      return this.hydrateTask(task);
    }
    const [updated] = await this.db
      .update(tasks)
      .set({ completedAt: null, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return this.hydrateTask(updated!);
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
    return this.hydrateTask(updated!);
  }

  /**
   * Массовые операции (POST /v1/tasks/batch). Чужие и несуществующие id
   * пропускаются молча; возвращается число применённых задач.
   */
  async batch(userId: string, dto: BatchTasksDto): Promise<BatchResultDto> {
    switch (dto.action) {
      case "complete": {
        // Повторы идут через completeOccurrence (сдвиг dueDate), поэтому по одной.
        const rows = await this.db
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(
              inArray(tasks.id, dto.taskIds),
              eq(tasks.userId, userId),
              isNull(tasks.trashedAt),
              isNull(tasks.completedAt),
            ),
          );
        for (const row of rows) {
          await this.complete(userId, row.id);
        }
        return { updated: rows.length };
      }
      case "trash": {
        const updated = await this.db
          .update(tasks)
          .set({ trashedAt: new Date(), updatedAt: new Date() })
          .where(
            and(inArray(tasks.id, dto.taskIds), eq(tasks.userId, userId), isNull(tasks.trashedAt)),
          )
          .returning({ id: tasks.id });
        return { updated: updated.length };
      }
      case "restore": {
        const updated = await this.db
          .update(tasks)
          .set({ trashedAt: null, updatedAt: new Date() })
          .where(
            and(
              inArray(tasks.id, dto.taskIds),
              eq(tasks.userId, userId),
              isNotNull(tasks.trashedAt),
            ),
          )
          .returning({ id: tasks.id });
        return { updated: updated.length };
      }
      case "move": {
        const listId = dto.listId!;
        await this.assertListOwned(userId, listId);
        const sectionId = dto.sectionId ?? null;
        if (sectionId !== null) {
          await this.assertSectionInList(userId, sectionId, listId);
        }
        const movable = await this.db
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(inArray(tasks.id, dto.taskIds), eq(tasks.userId, userId), isNull(tasks.trashedAt)),
          );
        let position = await this.nextPosition(listId, sectionId);
        for (const row of movable) {
          await this.db
            .update(tasks)
            .set({ listId, sectionId, position, updatedAt: new Date() })
            .where(eq(tasks.id, row.id));
          position += POSITION_STEP;
        }
        return { updated: movable.length };
      }
    }
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

  /**
   * Задача становится подзадачей другой задачи: переносим title и статус
   * выполнения, подзадачи конвертируемой задачи переезжают вместе с ней.
   * Мета-поля (дата/приоритет/теги/описание) модели подзадач недоступны —
   * конвертация их отбрасывает, исходная задача удаляется физически.
   */
  async nestTask(userId: string, taskId: string, parentTaskId: string): Promise<TaskDto> {
    if (taskId === parentTaskId) {
      throw new BadRequestException({ description: "Задача не может быть подзадачей самой себя" });
    }
    const task = await this.findOwned(userId, taskId);
    const parent = await this.findOwned(userId, parentTaskId);
    if (task.listId !== parent.listId) {
      throw new BadRequestException({
        description: "Подзадачей можно сделать задачу из того же списка",
      });
    }

    // Гидратация после транзакции: до коммита подзадачи не видны вне tx.
    const updatedParent = await this.db.transaction(async (tx) => {
      const [last] = await tx
        .select({ position: subtasks.position })
        .from(subtasks)
        .where(eq(subtasks.taskId, parent.id))
        .orderBy(desc(subtasks.position))
        .limit(1);
      let position = (last?.position ?? -POSITION_STEP) + POSITION_STEP;
      await tx.insert(subtasks).values({
        taskId: parent.id,
        title: task.title,
        done: task.completedAt !== null,
        position,
      });
      position += POSITION_STEP;
      const moved = await tx
        .select({ id: subtasks.id })
        .from(subtasks)
        .where(eq(subtasks.taskId, task.id))
        .orderBy(asc(subtasks.position));
      for (const row of moved) {
        await tx
          .update(subtasks)
          .set({ taskId: parent.id, position })
          .where(eq(subtasks.id, row.id));
        position += POSITION_STEP;
      }
      await tx.delete(tasks).where(eq(tasks.id, task.id));
      return parent;
    });
    return this.hydrateTask(updatedParent);
  }

  /**
   * Подзадача становится отдельной задачей: создаём задачу сразу после
   * родительской (та же позиционная семантика, что у afterTaskId) и удаляем
   * подзадачу. Статус выполнения переносится в completedAt.
   */
  async promoteSubtask(userId: string, subtaskId: string): Promise<TaskDto> {
    const subtask = await this.findOwnedSubtask(userId, subtaskId);
    const parent = await this.findOwned(userId, subtask.taskId);
    const position = await this.positionAfter(userId, parent.listId, parent.sectionId, parent.id);
    const [created] = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(tasks)
        .values({
          userId,
          listId: parent.listId,
          sectionId: parent.sectionId,
          title: subtask.title,
          position: position ?? (await this.nextPosition(parent.listId, parent.sectionId)),
          completedAt: subtask.done ? new Date() : null,
        })
        .returning();
      await tx.delete(subtasks).where(eq(subtasks.id, subtask.id));
      return [row!];
    });
    return this.hydrateTask(created);
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
