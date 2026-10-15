import { useMutation } from "@tanstack/react-query";
import { apiUpdateUser, type UpdateUserInput } from "../api/user-api";
import { useSessionStore } from "./session.store";

/** Обновление профиля; успешный ответ сразу попадает в стор сессии. */
export function useUpdateUser() {
  const setAuthed = useSessionStore((state) => state.setAuthed);
  return useMutation({
    mutationFn: (input: UpdateUserInput) => apiUpdateUser(input),
    onSuccess: (user) => setAuthed(user),
  });
}
