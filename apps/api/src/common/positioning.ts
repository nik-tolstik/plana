import { and, asc, desc, eq, ne, type SQL } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { AnyPgColumn, AnyPgTable, PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "../db/schema";

/**
 * Исполнитель запросов: пул БД или открытая транзакция (вложенные вызовы
 * transaction внутри транзакции дают savepoint). Общий предок NodePgDatabase
 * и PgTransaction — PgDatabase с той же схемой.
 */
export type DbExecutor = PgDatabase<NodePgQueryResultHKT, typeof schema>;

/** Шаг между соседними позициями (см. docs/architecture/erd.md — position шаг 1024). */
export const POSITION_STEP = 1024;

/** Таблица с колонками, по которым работают позиционные хелперы. */
type PositionalTable = AnyPgTable & {
  id: AnyPgColumn;
  position: AnyPgColumn;
  createdAt: AnyPgColumn;
};

/** Позиция после последней записи контейнера: новые записи встают в конец. */
export async function nextPosition(
  db: DbExecutor,
  table: PositionalTable,
  containerWhere: SQL | undefined,
): Promise<number> {
  const [last] = await db
    .select({ position: table.position })
    .from(table)
    .where(containerWhere)
    .orderBy(desc(table.position))
    .limit(1);
  const lastPosition = last?.position;
  return (typeof lastPosition === "number" ? lastPosition : -POSITION_STEP) + POSITION_STEP;
}

/**
 * Перенумеровывает записи контейнера с шагом POSITION_STEP, вставляя movedId
 * по целевому индексу (position = индекс × шаг); requestedIndex = undefined —
 * в конец. Вызывается внутри транзакции вызывающего; саму запись movedId
 * вызывающий обновляет отдельно.
 */
export async function insertAtPosition(
  db: DbExecutor,
  table: PositionalTable,
  containerWhere: SQL | undefined,
  movedId: string,
  requestedIndex: number | undefined,
): Promise<void> {
  const siblings = await db
    .select({ id: table.id, position: table.position })
    .from(table)
    .where(and(containerWhere, ne(table.id, movedId)))
    .orderBy(asc(table.position), asc(table.createdAt));

  const index =
    requestedIndex === undefined ? siblings.length : Math.min(requestedIndex, siblings.length);
  siblings.splice(index, 0, { id: movedId, position: -1 });
  for (const [i, sibling] of siblings.entries()) {
    const position = i * POSITION_STEP;
    if (sibling.position !== position) {
      await db.update(table).set({ position }).where(eq(table.id, sibling.id));
    }
  }
}
