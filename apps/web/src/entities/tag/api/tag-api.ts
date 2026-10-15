import type { TagDto } from "@plana/shared";
import { createTagSchema, patchTagSchema, tagSchema } from "@plana/shared";
import { z } from "zod";
import { apiClient } from "@/shared/api";

/** Все теги пользователя (упорядочены по position). */
export function apiGetTags(): Promise<TagDto[]> {
  return apiClient.get("/v1/tags", z.array(tagSchema));
}

export function apiCreateTag(input: typeof createTagSchema._input): Promise<TagDto> {
  return apiClient.post("/v1/tags", tagSchema, input);
}

export function apiUpdateTag(tagId: string, input: typeof patchTagSchema._input): Promise<TagDto> {
  return apiClient.patch(`/v1/tags/${tagId}`, tagSchema, input);
}

export function apiDeleteTag(tagId: string): Promise<void> {
  return apiClient.deleteVoid(`/v1/tags/${tagId}`);
}
