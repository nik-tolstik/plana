import type { SubtaskDto, TaskDto, TaskListDto } from "@plana/shared";
import {
  createSubtaskSchema,
  createTaskSchema,
  patchSubtaskSchema,
  patchTaskSchema,
  subtaskSchema,
  taskListDtoSchema,
  taskSchema,
} from "@plana/shared";
import { apiClient } from "@/shared/api/client";

export type TaskListFilter = {
  smart?: string;
  listId?: string;
  /** Поиск по заголовку и описанию (ilike). */
  q?: string;
  /** Только задачи с этим тегом. */
  tagId?: string;
  limit?: number;
};

function toQuery(filter: TaskListFilter): string {
  const params = new URLSearchParams();
  if (filter.smart) params.set("smart", filter.smart);
  if (filter.listId) params.set("listId", filter.listId);
  if (filter.q) params.set("q", filter.q);
  if (filter.tagId) params.set("tagId", filter.tagId);
  params.set("limit", String(filter.limit ?? 200));
  return params.toString();
}

export function apiGetTasks(filter: TaskListFilter): Promise<TaskListDto> {
  return apiClient.get(`/v1/tasks?${toQuery(filter)}`, taskListDtoSchema);
}

export function apiCreateTask(input: typeof createTaskSchema._input): Promise<TaskDto> {
  return apiClient.post("/v1/tasks", taskSchema, input);
}

export function apiUpdateTask(
  taskId: string,
  input: typeof patchTaskSchema._input,
): Promise<TaskDto> {
  return apiClient.patch(`/v1/tasks/${taskId}`, taskSchema, input);
}

export function apiCompleteTask(taskId: string): Promise<TaskDto> {
  return apiClient.post(`/v1/tasks/${taskId}/complete`, taskSchema, {});
}

export function apiUncompleteTask(taskId: string): Promise<TaskDto> {
  return apiClient.post(`/v1/tasks/${taskId}/uncomplete`, taskSchema, {});
}

export function apiTrashTask(taskId: string): Promise<void> {
  return apiClient.deleteVoid(`/v1/tasks/${taskId}`);
}

export function apiRestoreTask(taskId: string): Promise<TaskDto> {
  return apiClient.post(`/v1/tasks/${taskId}/restore`, taskSchema, {});
}

export function apiCreateSubtask(
  taskId: string,
  input: typeof createSubtaskSchema._input,
): Promise<SubtaskDto> {
  return apiClient.post(`/v1/tasks/${taskId}/subtasks`, subtaskSchema, input);
}

export function apiUpdateSubtask(
  subtaskId: string,
  input: typeof patchSubtaskSchema._input,
): Promise<SubtaskDto> {
  return apiClient.patch(`/v1/subtasks/${subtaskId}`, subtaskSchema, input);
}

export function apiDeleteSubtask(subtaskId: string): Promise<void> {
  return apiClient.deleteVoid(`/v1/subtasks/${subtaskId}`);
}

/** Задача становится подзадачей родительской задачи (DnD «внутрь»). */
export function apiNestTask(taskId: string, parentTaskId: string): Promise<TaskDto> {
  return apiClient.post(`/v1/tasks/${taskId}/nest`, taskSchema, { parentTaskId });
}

/** Подзадача становится отдельной задачей сразу после родительской. */
export function apiPromoteSubtask(subtaskId: string): Promise<TaskDto> {
  return apiClient.post(`/v1/subtasks/${subtaskId}/promote`, taskSchema, {});
}
