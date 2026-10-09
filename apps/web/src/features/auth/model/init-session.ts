import { useSessionStore } from "@/entities/user";
import { refreshAccessToken, session } from "@/shared/api/session";
import { applyTheme } from "@/features/theme-switch/model/theme";

/**
 * Инициализация сессии при старте приложения:
 * если есть refresh-токен — обновляет его и восстанавливает пользователя.
 */
export async function initSession(): Promise<void> {
  session.setSessionListener((user) => {
    applyTheme(user.theme);
    useSessionStore.getState().setAuthed(user);
  });

  if (!session.getRefreshToken()) {
    useSessionStore.getState().setAnon();
    return;
  }

  // При успехе слушатель выше уже выставил authed; при неудаче — аноним.
  const token = await refreshAccessToken();
  if (token === null) {
    useSessionStore.getState().setAnon();
  }
}
