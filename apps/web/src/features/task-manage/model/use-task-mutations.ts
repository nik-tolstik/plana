import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskDto, TaskListDto } from "@plana/shared";
import { taskKeys } from "@/entities/task";
import { tagKeys } from "@/entities/tag";
import { playCompletionSound } from "@/shared/lib/completion-sound";
import {
  apiCompleteTask,
  apiCreateSubtask,
  apiCreateTask,
  apiNestTask,
  apiPromoteSubtask,
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

/** Скалярные поля, безопасные для оптимистичного патча кэша. */
type OptimisticTaskPatch = Partial<
  Pick<TaskDto, "title" | "description" | "priority" | "dueDate" | "listId" | "sectionId">
>;

export function useUpdateTask() {
  const invalidate = useInvalidateTasksAndTags();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...input }: { taskId: string } & Parameters<typeof apiUpdateTask>[1]) =>
      apiUpdateTask(taskId, input),
    // Скалярные поля применяем сразу в кэше: без этого blur инлайн-правки
    // названия успевает показать старое значение до ответа сервера.
    onMutate: async ({ taskId, ...input }) => {
      const optimistic: OptimisticTaskPatch = {};
      if (input.title !== undefined) optimistic.title = input.title;
      if (input.description !== undefined) optimistic.description = input.description;
      if (input.priority !== undefined) optimistic.priority = input.priority;
      if (input.dueDate !== undefined) optimistic.dueDate = input.dueDate;
      if (input.listId !== undefined) optimistic.listId = input.listId;
      if (input.sectionId !== undefined) optimistic.sectionId = input.sectionId;
      if (Object.keys(optimistic).length === 0) return {};
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const snapshots: Array<[readonly unknown[], TaskListDto]> = queryClient
        .getQueriesData<TaskListDto>({ queryKey: taskKeys.all })
        .filter((entry): entry is [readonly unknown[], TaskListDto] => entry[1] !== undefined);
      for (const [key, data] of snapshots) {
        let patched = false;
        const items = data.items.map((task) => {
          if (task.id !== taskId) return task;
          patched = true;
          return { ...task, ...optimistic };
        });
        if (!patched) continue;
        queryClient.setQueryData<TaskListDto>(key, { ...data, items });
      }
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
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

export function useNestTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, parentTaskId }: { taskId: string; parentTaskId: string }) =>
      apiNestTask(taskId, parentTaskId),
    onSuccess: invalidate,
  });
}

export function usePromoteSubtask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: apiPromoteSubtask,
    onSuccess: invalidate,
  });
}
