import { z } from "zod";
import { apiClient } from "./client";

const healthSchema = z.object({
  status: z.string(),
  version: z.string(),
  env: z.string(),
});

export type Health = z.infer<typeof healthSchema>;

export function fetchHealth(): Promise<Health> {
  return apiClient.get("/v1/health", healthSchema);
}
