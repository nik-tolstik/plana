import { useSessionStore } from "@/entities/user";
import { PageFade } from "@/shared/ui";
import { SystemStatus } from "@/widgets/system-status";

export function HomePage() {
  const user = useSessionStore((state) => state.user);

  return (
    <PageFade className="max-w-md">
      <h1 className="text-xl font-semibold">Привет, {user?.name ?? "друг"}</h1>
      <p className="text-muted-foreground">
        Слева — умные списки, ваши списки и папки. Начните с «Сегодня» или добавьте задачу в Inbox.
      </p>
      <SystemStatus />
    </PageFade>
  );
}
