import { useQuery } from "@tanstack/react-query";
import { apiGetHabits } from "../api/habit-api";
import { habitKeys } from "./keys";

/** Привычки с вхождениями за 60 дней (для стриков и календаря). */
export function useHabitsQuery() {
  return useQuery({
    queryKey: habitKeys.all,
    queryFn: apiGetHabits,
    staleTime: 30_000,
  });
}
