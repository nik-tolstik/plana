import { useSessionStore } from "@/entities/user";
import { refreshAccessToken, session } from "@/shared/api";
import { queryClient } from "@/shared/lib/query-client";
import { applyTheme } from "@/features/theme-switch";

/**
 * Инициализация сессии при старте приложения:
 * если есть refresh-токен — обновляет его и восстанавливает пользователя.
 */
export async function initSession(): Promise<void> {
  session.setSessionListener((user) => {
    if (user === null) {
      // Рефреш окончательно не удался — уходим в аноним и чистим кэш,
      // чтобы данные прошлого пользователя не достались следующему.
      queryClient.clear();
      useSessionStore.getState().setAnon();
      return;
    }
    applyTheme(user.theme);
    useSessionStore.getState().setAuthed(user);
  });

  if (!session.getRefreshToken()) {
    useSessionStore.getState().setAnon();
    return;
  }

  // При успехе слушатель выше уже выставил authed; при неудаче — тоже (null).
  await refreshAccessToken();
}
