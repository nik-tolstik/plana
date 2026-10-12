import { useHealthQuery } from "../model/use-health-query";

export function SystemStatus() {
  const { data, isPending, isError } = useHealthQuery();

  if (isPending) {
    return <p className="text-muted-foreground">Проверка соединения с API…</p>;
  }

  if (isError) {
    return <p className="text-destructive">⚠️ API недоступно</p>;
  }

  return (
    <p className="text-muted-foreground">
      ✓ API: {data.status} · версия {data.version} · окружение {data.env}
    </p>
  );
}
