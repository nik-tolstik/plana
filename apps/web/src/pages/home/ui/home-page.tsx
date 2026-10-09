import { useSessionStore } from "@/entities/user";
import { SystemStatus } from "@/widgets/system-status";

export function HomePage() {
  const user = useSessionStore((state) => state.user);

  return (
    <>
      <h1>Привет, {user?.name ?? "друг"}</h1>
      <p>Слева — входящие, списки и папки. Создайте первый список; задачи появятся в M3.</p>
      <SystemStatus />
    </>
  );
}
