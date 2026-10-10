import { useSessionStore } from "@/entities/user";

/** Таймзона пользователя из профиля; до загрузки — системная. */
export function useUserTimezone(): string {
  return (
    useSessionStore((state) => state.user?.timezone) ??
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}
