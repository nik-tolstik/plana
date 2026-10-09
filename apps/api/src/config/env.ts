import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_VERSION: z.string().default("dev"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET должен быть не короче 32 символов"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: unknown): Env {
  return envSchema.parse(raw);
}

export const env = loadEnv(process.env);
