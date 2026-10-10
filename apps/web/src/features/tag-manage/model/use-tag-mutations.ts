import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDeleteTag, apiUpdateTag, tagKeys } from "@/entities/tag";
import { taskKeys } from "@/entities/task";

function useInvalidateTags() {
  const queryClient = useQueryClient();
  // Удаление/переименование тега меняет tags в TaskDto — инвалидируем и задачи.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tagKeys.all }),
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    ]);
}

export function useUpdateTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: ({ tagId, ...input }: { tagId: string } & Parameters<typeof apiUpdateTag>[1]) =>
      apiUpdateTag(tagId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: apiDeleteTag,
    onSuccess: invalidate,
  });
}
