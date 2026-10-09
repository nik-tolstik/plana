import { useSessionStore } from "@/entities/user";
import { ThemeSwitch } from "@/features/theme-switch";

export function SettingsPage() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);

  return (
    <>
      <h1>Настройки</h1>
      <dl>
        <dt>Имя</dt>
        <dd>{user?.name}</dd>
        <dt>Email</dt>
        <dd>{user?.email}</dd>
        <dt>Таймзона</dt>
        <dd>{user?.timezone}</dd>
      </dl>
      <h2>Тема оформления</h2>
      <ThemeSwitch onUserUpdated={setUser} />
    </>
  );
}
