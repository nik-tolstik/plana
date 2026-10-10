import { useQuery } from "@tanstack/react-query";
import { apiGetTasks, type TaskListFilter } from "../api/task-api";
import { taskKeys } from "./keys";

/** Задачи по фильтру (умный список или конкретный список). */
export function useTasksQuery(filter: TaskListFilter) {
  return useQuery({
    queryKey: taskKeys.list(filter),
    queryFn: () => apiGetTasks(filter),
    staleTime: 30_000,
  });
}
