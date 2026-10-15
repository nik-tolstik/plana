import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateHabitDto,
  HabitEntryDto,
  HabitWithEntriesDto,
  PatchHabitDto,
  SetHabitEntryDto,
} from "@plana/shared";
import { addDays, compareDays, dayStringSchema, todayInZone } from "@plana/shared";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { insertAtPosition, nextPosition } from "../../common/positioning";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { habitEntries, habits, users } from "../../db/schema";

export type HabitRow = typeof habits.$inferSelect;
export type HabitEntryRow = typeof habitEntries.$inferSelect;

/** Окно вхождений в GET /v1/habits: сегодня и 59 дней назад. */
const ENTRY_WINDOW_DAYS = 59;

function toHabitDto(
  row: HabitRow,
  entries: Array<{ date: string; value: number }>,
): HabitWithEntriesDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    targetValue: row.targetValue,
    daysOfWeek: row.daysOfWeek,
    color: row.color as HabitWithEntriesDto["color"],
    position: row.position,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    entries: [...entries].sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}

function toEntryDto(row: HabitEntryRow): HabitEntryDto {
  return {
    habitId: row.habitId,
    date: row.date,
    value: row.value,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class HabitsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private async getTimezone(userId: string): Promise<string> {
    const [row] = await this.db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.timezone ?? "UTC";
  }

  async findOwned(userId: string, habitId: string): Promise<HabitRow> {
    const [habit] = await this.db
      .select()
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
      .limit(1);
    if (!habit) {
      throw new NotFoundException({ description: "Привычка не найдена" });
    }
    return habit;
  }

  /** Все привычки + вхождения за последние 60 дней (для стриков и календаря). */
  async findAll(userId: string): Promise<HabitWithEntriesDto[]> {
    const today = todayInZone(new Date(), await this.getTimezone(userId));
    const from = addDays(today, -ENTRY_WINDOW_DAYS);
    const habitRows = await this.db
      .select()
      .from(habits)
      .where(eq(habits.userId, userId))
      .orderBy(asc(habits.position));
    const ids = habitRows.map((row) => row.id);
    const entryRows = ids.length
      ? await this.db
          .select({
            habitId: habitEntries.habitId,
            date: habitEntries.date,
            value: habitEntries.value,
          })
          .from(habitEntries)
          .where(and(inArray(habitEntries.habitId, ids), gte(habitEntries.date, from)))
      : [];
    const byHabit = new Map<string, Array<{ date: string; value: number }>>();
    for (const entry of entryRows) {
      const list = byHabit.get(entry.habitId) ?? [];
      list.push({ date: entry.date, value: entry.value });
      byHabit.set(entry.habitId, list);
    }
    return habitRows.map((row) => toHabitDto(row, byHabit.get(row.id) ?? []));
  }

  async create(userId: string, dto: CreateHabitDto): Promise<HabitWithEntriesDto> {
    const [created] = await this.db
      .insert(habits)
      .values({
        userId,
        name: dto.name,
        type: dto.type,
        targetValue: dto.type === "number" ? dto.targetValue! : null,
        daysOfWeek: dto.daysOfWeek ?? 127,
        color: dto.color ?? "gray",
        position: await nextPosition(this.db, habits, eq(habits.userId, userId)),
      })
      .returning();
    return toHabitDto(created!, []);
  }

  async update(userId: string, habitId: string, dto: PatchHabitDto): Promise<HabitWithEntriesDto> {
    const habit = await this.findOwned(userId, habitId);

    // После слияния тип и цель должны согласовываться.
    const type = dto.type ?? habit.type;
    const targetValue = dto.targetValue !== undefined ? dto.targetValue : habit.targetValue;
    if (type === "number" && targetValue === null) {
      throw new BadRequestException({ description: "Для числовой привычки нужна цель на день" });
    }
    const finalTarget = type === "check" ? null : targetValue;

    const values: Partial<typeof habits.$inferInsert> = { updatedAt: new Date() };
    if (dto.name !== undefined) values.name = dto.name;
    if (dto.type !== undefined) values.type = type;
    if (dto.targetValue !== undefined || type === "check") values.targetValue = finalTarget;
    if (dto.daysOfWeek !== undefined) values.daysOfWeek = dto.daysOfWeek;
    if (dto.color !== undefined) values.color = dto.color;
    if (dto.archived !== undefined) values.archivedAt = dto.archived ? new Date() : null;

    if (dto.position === undefined) {
      const [updated] = await this.db
        .update(habits)
        .set(values)
        .where(eq(habits.id, habitId))
        .returning();
      return toHabitDto(updated!, await this.loadEntries(habitId));
    }

    // position — целевой индекс среди привычек пользователя; перенумерация шагом 1024.
    const requestedPosition = dto.position;
    const [updated] = await this.db.transaction(async (tx) => {
      await insertAtPosition(tx, habits, eq(habits.userId, userId), habitId, requestedPosition);
      return tx.update(habits).set(values).where(eq(habits.id, habitId)).returning();
    });
    return toHabitDto(updated!, await this.loadEntries(habitId));
  }

  /** Физическое удаление с вхождениями (FK cascade). */
  async remove(userId: string, habitId: string): Promise<void> {
    const habit = await this.findOwned(userId, habitId);
    await this.db.delete(habits).where(eq(habits.id, habit.id));
  }

  /**
   * Отметка за день — идемпотентный upsert. Будущий день нельзя отметить;
   * границы value зависят от типа: check — 0..1, number — 0..targetValue*2.
   */
  async setEntry(
    userId: string,
    habitId: string,
    date: string,
    dto: SetHabitEntryDto,
  ): Promise<HabitEntryDto> {
    if (!dayStringSchema.safeParse(date).success) {
      throw new BadRequestException({ description: "Дата в формате YYYY-MM-DD" });
    }
    const habit = await this.findOwned(userId, habitId);
    if (habit.archivedAt !== null) {
      throw new BadRequestException({ description: "Привычка в архиве" });
    }
    const today = todayInZone(new Date(), await this.getTimezone(userId));
    if (compareDays(date, today) > 0) {
      throw new BadRequestException({ description: "Нельзя отметить будущий день" });
    }
    if (habit.type === "check") {
      if (dto.value !== 0 && dto.value !== 1) {
        throw new BadRequestException({ description: "У чекбокс-привычки значение 0 или 1" });
      }
    } else if (dto.value > (habit.targetValue ?? 1) * 2) {
      throw new BadRequestException({
        description: `Значение больше удвоенной цели (${(habit.targetValue ?? 1) * 2})`,
      });
    }

    const [entry] = await this.db
      .insert(habitEntries)
      .values({ habitId, userId, date, value: dto.value })
      .onConflictDoUpdate({
        target: [habitEntries.habitId, habitEntries.date],
        set: { value: dto.value, updatedAt: new Date() },
      })
      .returning();
    return toEntryDto(entry!);
  }

  /** Убрать отметку за день (идемпотентно — нет записи, нет ошибки). */
  async deleteEntry(userId: string, habitId: string, date: string): Promise<void> {
    if (!dayStringSchema.safeParse(date).success) {
      throw new BadRequestException({ description: "Дата в формате YYYY-MM-DD" });
    }
    await this.findOwned(userId, habitId);
    await this.db
      .delete(habitEntries)
      .where(and(eq(habitEntries.habitId, habitId), eq(habitEntries.date, date)));
  }

  private async loadEntries(habitId: string): Promise<Array<{ date: string; value: number }>> {
    const rows = await this.db
      .select({ date: habitEntries.date, value: habitEntries.value })
      .from(habitEntries)
      .where(eq(habitEntries.habitId, habitId));
    return rows.map((row) => ({ date: row.date, value: row.value }));
  }
}
