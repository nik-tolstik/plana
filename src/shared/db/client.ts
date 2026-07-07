import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://plana:plana@localhost:5432/plana'

const queryClient = postgres(databaseUrl)

export const db = drizzle(queryClient)

export type Database = typeof db
