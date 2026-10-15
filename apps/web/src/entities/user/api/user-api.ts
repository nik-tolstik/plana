import { userSchema, type UserDto } from "@plana/shared";
import { apiClient } from "@/shared/api";

/** Обновляемые поля профиля (PATCH /v1/me, patchMeSchema в @plana/shared). */
export type UpdateUserInput = Partial<Pick<UserDto, "name" | "timezone" | "theme">>;

export function apiUpdateUser(input: UpdateUserInput): Promise<UserDto> {
  return apiClient.patch("/v1/me", userSchema, input);
}
