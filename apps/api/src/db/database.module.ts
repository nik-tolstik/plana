import { Module } from "@nestjs/common";
import { createDb } from "./drizzle";

export const DB = Symbol("DB");

@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => createDb(process.env.DATABASE_URL ?? ""),
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
