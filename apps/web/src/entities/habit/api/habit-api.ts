import type {
  CreateHabitDto,
  HabitEntryDto,
  HabitWithEntriesDto,
  PatchHabitDto,
} from "@plana/shared";
import { habitEntrySchema, habitWithEntriesSchema, patchHabitSchema } from "@plana/shared";
import { z } from "zod";
import { apiClient } from "@/shared/api";

/** Все привычки + вхождения за последние 60 дней. */
export function apiGetHabits(): Promise<HabitWithEntriesDto[]> {
  return apiClient.get("/v1/habits", z.array(habitWithEntriesSchema));
}

export function apiCreateHabit(input: CreateHabitDto): Promise<HabitWithEntriesDto> {
  return apiClient.post("/v1/habits", habitWithEntriesSchema, input);
}

export function apiUpdateHabit(
  habitId: string,
  input: typeof patchHabitSchema._input,
): Promise<HabitWithEntriesDto> {
  return apiClient.patch(`/v1/habits/${habitId}`, habitWithEntriesSchema, input);
}

export function apiDeleteHabit(habitId: string): Promise<void> {
  return apiClient.deleteVoid(`/v1/habits/${habitId}`);
}

/** Отметка за день: идемпотентный upsert (check: 0|1; number: 0..target*2). */
export function apiSetHabitEntry(
  habitId: string,
  date: string,
  value: number,
): Promise<HabitEntryDto> {
  return apiClient.put(`/v1/habits/${habitId}/entries/${date}`, habitEntrySchema, { value });
}

export function apiDeleteHabitEntry(habitId: string, date: string): Promise<void> {
  return apiClient.deleteVoid(`/v1/habits/${habitId}/entries/${date}`);
}

export type { CreateHabitDto, HabitEntryDto, HabitWithEntriesDto, PatchHabitDto };
