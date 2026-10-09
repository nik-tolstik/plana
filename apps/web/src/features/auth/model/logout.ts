import { useSessionStore } from "@/entities/user";
import { apiLogout } from "../api/auth-api";
import { session } from "@/shared/api/session";

/** Выход: отзывает текущую сессию на сервере и сбрасывает локальное состояние. */
export async function logout(): Promise<void> {
  const refreshToken = session.getRefreshToken();
  if (refreshToken) {
    await apiLogout(refreshToken).catch(() => undefined);
  }
  session.clear();
  useSessionStore.getState().setAnon();
}
