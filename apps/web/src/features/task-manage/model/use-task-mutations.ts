import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/entities/task";
import { tagKeys } from "@/entities/tag";
import { playCompletionSound } from "@/shared/lib/completion-sound";
import {
  apiCompleteTask,
  apiCreateSubtask,
  apiCreateTask,
  apiRestoreTask,
  apiTrashTask,
  apiUncompleteTask,
  apiUpdateSubtask,
  apiUpdateTask,
  apiDeleteSubtask,
} from "@/entities/task";

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: taskKeys.all });
}

/** Создание/обновление с tagNames может создать тег — инвалидируем и их. */
function useInvalidateTasksAndTags() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      queryClient.invalidateQueries({ queryKey: tagKeys.all }),
    ]);
}

export function useCreateTask() {
  const invalidate = useInvalidateTasksAndTags();
  return useMutation({
    mutationFn: apiCreateTask,
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasksAndTags();
  return useMutation({
    mutationFn: ({ taskId, ...input }: { taskId: string } & Parameters<typeof apiUpdateTask>[1]) =>
      apiUpdateTask(taskId, input),
    onSuccess: invalidate,
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: apiCompleteTask,
    onSuccess: invalidate,
    // Любой способ завершения (чекбокс, панель, ПКМ) даёт звуковое подтверждение.
    onMutate: () => playCompletionSound(),
  });
}

export function useUncompleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: apiUncompleteTask,
    onSuccess: invalidate,
  });
}

export function useTrashTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: apiTrashTask,
    onSuccess: invalidate,
  });
}

export function useRestoreTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: apiRestoreTask,
    onSuccess: invalidate,
  });
}

export function useCreateSubtask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      apiCreateSubtask(taskId, { title }),
    onSuccess: invalidate,
  });
}

export function useUpdateSubtask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      subtaskId,
      ...input
    }: { subtaskId: string } & Parameters<typeof apiUpdateSubtask>[1]) =>
      apiUpdateSubtask(subtaskId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSubtask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: apiDeleteSubtask,
    onSuccess: invalidate,
  });
}
