import { useSessionStore } from "@/entities/user";
import { SystemStatus } from "@/widgets/system-status";

export function HomePage() {
  const user = useSessionStore((state) => state.user);

  return (
    <>
      <h1>Привет, {user?.name ?? "друг"}</h1>
      <p>
        Слева — умные списки, ваши списки и папки. Начните с «Сегодня» или добавьте задачу в Inbox.
      </p>
      <SystemStatus />
    </>
  );
}
