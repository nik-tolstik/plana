import { healthDtoSchema, type HealthDto } from "@plana/shared";
import { apiClient } from "@/shared/api";

export type { HealthDto };

export function fetchHealth(): Promise<HealthDto> {
  return apiClient.get("/v1/health", healthDtoSchema);
}
