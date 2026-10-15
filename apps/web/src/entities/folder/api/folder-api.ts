import type { FolderDto } from "@plana/shared";
import { createFolderSchema, folderSchema, patchFolderSchema } from "@plana/shared";
import { apiClient } from "@/shared/api";

export function apiCreateFolder(input: typeof createFolderSchema._input): Promise<FolderDto> {
  return apiClient.post("/v1/folders", folderSchema, input);
}

export function apiUpdateFolder(
  folderId: string,
  input: typeof patchFolderSchema._input,
): Promise<FolderDto> {
  return apiClient.patch(`/v1/folders/${folderId}`, folderSchema, input);
}

export function apiDeleteFolder(folderId: string): Promise<void> {
  return apiClient.deleteVoid(`/v1/folders/${folderId}`);
}
