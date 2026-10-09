import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.url().default("http://localhost:3000"),
});

export const parseEnv = (raw: unknown) => envSchema.parse(raw);

export const env = parseEnv(import.meta.env);
