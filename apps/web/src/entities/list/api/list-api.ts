import type { ListDto, SidebarDto } from "@plana/shared";
import { createListSchema, listSchema, patchListSchema, sidebarDtoSchema } from "@plana/shared";
import { apiClient } from "@/shared/api/client";

/** Дерево сайдбара одним запросом (GET /v1/folders). */
export function apiGetSidebar(): Promise<SidebarDto> {
  return apiClient.get("/v1/folders", sidebarDtoSchema);
}

export function apiCreateList(input: typeof createListSchema._input): Promise<ListDto> {
  return apiClient.post("/v1/lists", listSchema, input);
}

export function apiUpdateList(
  listId: string,
  input: typeof patchListSchema._input,
): Promise<ListDto> {
  return apiClient.patch(`/v1/lists/${listId}`, listSchema, input);
}

export function apiTrashList(listId: string): Promise<void> {
  return apiClient.deleteVoid(`/v1/lists/${listId}`);
}

export function apiRestoreList(listId: string): Promise<ListDto> {
  return apiClient.post(`/v1/lists/${listId}/restore`, listSchema, {});
}
