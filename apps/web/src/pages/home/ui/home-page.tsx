import { useNavigate } from "react-router";
import { useSessionStore } from "@/entities/user";
import { logout } from "@/features/auth";
import { ThemeSwitch } from "@/features/theme-switch";
import { SystemStatus } from "@/widgets/system-status";

export function HomePage() {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <h1>Привет, {user?.name ?? "друг"}</h1>
      <p>M1: аутентификация и профиль работают. Задачи появятся на шаге M3.</p>
      <ThemeSwitch onUserUpdated={setUser} />
      <p>
        <button type="button" onClick={onLogout}>
          Выйти
        </button>
      </p>
      <SystemStatus />
    </main>
  );
}
