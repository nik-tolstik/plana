import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiCreateHabit,
  apiDeleteHabit,
  apiDeleteHabitEntry,
  apiSetHabitEntry,
  apiUpdateHabit,
  type CreateHabitDto,
} from "@/entities/habit";
import { habitKeys } from "@/entities/habit";

function useInvalidateHabits() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: habitKeys.all });
}

export function useCreateHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: (input: CreateHabitDto) => apiCreateHabit(input),
    onSuccess: invalidate,
  });
}

export function useUpdateHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({
      habitId,
      ...input
    }: { habitId: string } & Parameters<typeof apiUpdateHabit>[1]) =>
      apiUpdateHabit(habitId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: apiDeleteHabit,
    onSuccess: invalidate,
  });
}

export function useSetHabitEntry() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ habitId, date, value }: { habitId: string; date: string; value: number }) =>
      apiSetHabitEntry(habitId, date, value),
    onSuccess: invalidate,
  });
}

export function useDeleteHabitEntry() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      apiDeleteHabitEntry(habitId, date),
    onSuccess: invalidate,
  });
}
