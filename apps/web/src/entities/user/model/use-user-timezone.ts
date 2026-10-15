import { useSessionStore } from "./session.store";

/** Таймзона пользователя из профиля; до загрузки — системная. */
export function useUserTimezone(): string {
  return (
    useSessionStore((state) => state.user?.timezone) ??
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}
