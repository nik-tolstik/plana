import { Link, useParams } from "react-router";
import { useSidebarQuery } from "@/entities/list";

/** Страница списка: шапка с названием; задачи появятся в M3. */
export function ListPage() {
  const { listId = "" } = useParams();
  const sidebarQuery = useSidebarQuery();

  if (sidebarQuery.isPending) {
    return <p>Загрузка…</p>;
  }

  const sidebar = sidebarQuery.data;
  const list = sidebar
    ? [
        sidebar.inbox,
        ...sidebar.rootLists,
        ...sidebar.folders.flatMap((folder) => folder.lists),
      ].find((candidate) => candidate.id === listId)
    : undefined;

  if (!list) {
    return (
      <>
        <h1>Список не найден</h1>
        <p>
          Возможно, он удалён. <Link to="/">Вернуться на главную</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>
        {list.emoji ? `${list.emoji} ` : ""}
        {list.name}
      </h1>
      <p>Задач пока нет — список задач появится в M3.</p>
    </>
  );
}
