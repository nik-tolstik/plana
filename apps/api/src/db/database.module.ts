import { Module, type OnApplicationShutdown } from "@nestjs/common";
import { env } from "../config/env";
import { createDb } from "./drizzle";

export const DB = Symbol("DB");

const db = createDb(env.DATABASE_URL);

@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  /** Пул postgres закрывается на SIGTERM/SIGINT, чтобы не рвать запросы при деплое. */
  onApplicationShutdown(): void {
    void db.$client.end();
  }
}
