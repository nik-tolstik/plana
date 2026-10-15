import { useSessionStore } from "@/entities/user";
import { apiLogout } from "../api/auth-api";
import { session } from "@/shared/api";
import { queryClient } from "@/shared/lib/query-client";

/**
 * Выход: отзывает текущую сессию на сервере и сбрасывает локальное
 * состояние. Кэш запросов чистим целиком — иначе задачи и структура
 * прошлого пользователя достаются следующему (staleTime до 60 с).
 */
export async function logout(): Promise<void> {
  const refreshToken = session.getRefreshToken();
  if (refreshToken) {
    await apiLogout(refreshToken).catch(() => undefined);
  }
  session.clear();
  queryClient.clear();
  useSessionStore.getState().setAnon();
}
