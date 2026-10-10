import { useQuery } from "@tanstack/react-query";
import { apiGetTasks, type TaskListFilter } from "../api/task-api";
import { taskKeys } from "./keys";

/** Задачи по фильтру (умный список, конкретный список, поиск q или тег). */
export function useTasksQuery(filter: TaskListFilter, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: taskKeys.list(filter),
    queryFn: () => apiGetTasks(filter),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}
