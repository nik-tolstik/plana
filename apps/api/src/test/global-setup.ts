process.env.DATABASE_URL ??= "postgres://plana:plana@localhost:55434/plana_test";
process.env.JWT_SECRET ??= "test-jwt-secret-0123456789abcdef0123456789abcdef";
process.env.NODE_ENV = "test";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function setup(): Promise<void> {
  const client = postgres(process.env.DATABASE_URL!);
  await migrate(drizzle({ client }), { migrationsFolder: "./drizzle" });
  await client.end();
}
