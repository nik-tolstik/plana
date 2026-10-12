import { useSessionStore } from "@/entities/user";
import { ThemeSwitch } from "@/features/theme-switch";
import { PageFade } from "@/shared/ui";

export function SettingsPage() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);

  const rows: Array<[string, string | undefined]> = [
    ["Имя", user?.name],
    ["Email", user?.email],
    ["Таймзона", user?.timezone],
  ];

  return (
    <PageFade className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Настройки</h1>
      <dl className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3">
        {rows.map(([label, value]) => (
          <div className="flex items-baseline justify-between gap-4" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mb-2 text-base font-semibold">Тема оформления</h2>
      <ThemeSwitch onUserUpdated={setUser} />
    </PageFade>
  );
}
