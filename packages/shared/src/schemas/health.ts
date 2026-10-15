import { z } from "zod";

/** Ответ GET /v1/health. */
export const healthDtoSchema = z.object({
  status: z.string(),
  version: z.string(),
  env: z.string(),
});

export type HealthDto = z.infer<typeof healthDtoSchema>;
