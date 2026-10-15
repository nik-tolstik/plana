import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiCreateList,
  apiRestoreList,
  apiTrashList,
  apiUpdateList,
  structureKeys,
} from "@/entities/list";
import { apiCreateFolder, apiDeleteFolder, apiUpdateFolder } from "@/entities/folder";
import { taskKeys } from "@/entities/task";

/** Все мутации структуры после успеха перезагружают дерево сайдбара. */
function useInvalidateSidebar() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: structureKeys.sidebar });
}

/** Корзина списка меняет и задачи (уезжают/возвращаются вместе с ним). */
function useInvalidateSidebarAndTasks() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: structureKeys.sidebar }),
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    ]);
}

export function useCreateList() {
  const invalidate = useInvalidateSidebar();
  return useMutation({ mutationFn: apiCreateList, onSuccess: invalidate });
}

export function useUpdateList() {
  const invalidate = useInvalidateSidebar();
  return useMutation({
    mutationFn: ({
      listId,
      input,
    }: {
      listId: string;
      input: Parameters<typeof apiUpdateList>[1];
    }) => apiUpdateList(listId, input),
    onSuccess: invalidate,
  });
}

export function useTrashList() {
  const invalidate = useInvalidateSidebarAndTasks();
  return useMutation({ mutationFn: apiTrashList, onSuccess: invalidate });
}

export function useRestoreList() {
  const invalidate = useInvalidateSidebarAndTasks();
  return useMutation({ mutationFn: apiRestoreList, onSuccess: invalidate });
}

export function useCreateFolder() {
  const invalidate = useInvalidateSidebar();
  return useMutation({ mutationFn: apiCreateFolder, onSuccess: invalidate });
}

export function useUpdateFolder() {
  const invalidate = useInvalidateSidebar();
  return useMutation({
    mutationFn: ({
      folderId,
      input,
    }: {
      folderId: string;
      input: Parameters<typeof apiUpdateFolder>[1];
    }) => apiUpdateFolder(folderId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateSidebar();
  return useMutation({ mutationFn: apiDeleteFolder, onSuccess: invalidate });
}
