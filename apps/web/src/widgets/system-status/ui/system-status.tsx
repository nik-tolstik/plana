import { useHealthQuery } from "../model/use-health-query";

export function SystemStatus() {
  const { data, isPending, isError } = useHealthQuery();

  if (isPending) {
    return <p>Проверка соединения с API…</p>;
  }

  if (isError) {
    return <p>⚠️ API недоступно</p>;
  }

  return (
    <p>
      ✓ API: {data.status} · версия {data.version} · окружение {data.env}
    </p>
  );
}
