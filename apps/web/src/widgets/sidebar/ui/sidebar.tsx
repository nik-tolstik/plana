import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useSidebarQuery } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { logout } from "@/features/auth";
import { useCreateFolder, useCreateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { AddForm } from "./add-form";
import { FolderGroup } from "./folder-group";
import { ListRow } from "./list-row";

/** Умные списки — вычисляемые представления задач (роуты, не хранятся в БД). */
const SMART_LINKS: Array<{ to: string; label: string }> = [
  { to: "/today", label: "Сегодня" },
  { to: "/tomorrow", label: "Завтра" },
  { to: "/next7", label: "Следующие 7 дней" },
  { to: "/all", label: "Все" },
];

const SMART_EXTRA: Array<{ to: string; label: string }> = [
  { to: "/completed", label: "Завершённые" },
  { to: "/trash", label: "Корзина" },
];

export function Sidebar() {
  const sidebarQuery = useSidebarQuery();
  const tagsQuery = useTagsQuery();
  const navigate = useNavigate();

  const createList = useCreateList();
  const createFolder = useCreateFolder();

  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);

  const sidebar = sidebarQuery.data;
  const tags = tagsQuery.data ?? [];

  async function addList(name: string) {
    try {
      await createList.mutateAsync({ name });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function addFolder(name: string) {
    try {
      await createFolder.mutateAsync({ name });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <Link className="sidebar-brand" to="/">
        Plana
      </Link>

      <form
        className="sidebar-search"
        onSubmit={(event) => {
          event.preventDefault();
          const q = search.trim();
          navigate(q.length > 0 ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
      >
        <input
          aria-label="Поиск задач"
          placeholder="Поиск…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </form>

      <nav aria-label="Списки">
        {sidebar && (
          <div className="sidebar-section">
            <ListRow list={sidebar.inbox} onError={setError} />
            {SMART_LINKS.map((link) => (
              <NavLink
                className={({ isActive }) => `row row-link${isActive ? " row-active" : ""}`}
                key={link.to}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
            {SMART_EXTRA.map((link) => (
              <NavLink
                className={({ isActive }) => `row row-link${isActive ? " row-active" : ""}`}
                key={link.to}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="sidebar-section">
          {sidebar?.rootLists.map((list) => (
            <ListRow key={list.id} list={list} onError={setError} />
          ))}
          {sidebar?.folders.map((folder) => (
            <FolderGroup key={folder.id} folder={folder} onError={setError} />
          ))}

          {addingList ? (
            <AddForm
              placeholder="Название списка"
              onSubmit={addList}
              onCancel={() => setAddingList(false)}
            />
          ) : (
            <button
              className="add-btn"
              type="button"
              onClick={() => {
                setAddingList(true);
                setAddingFolder(false);
              }}
            >
              + Список
            </button>
          )}

          {addingFolder ? (
            <AddForm
              placeholder="Название папки"
              onSubmit={addFolder}
              onCancel={() => setAddingFolder(false)}
            />
          ) : (
            <button
              className="add-btn"
              type="button"
              onClick={() => {
                setAddingFolder(true);
                setAddingList(false);
              }}
            >
              + Папка
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <div className="sidebar-section sidebar-tags">
            {tags.map((tag) => (
              <NavLink
                className={({ isActive }) => `row row-link${isActive ? " row-active" : ""}`}
                key={tag.id}
                to={`/tag/${tag.id}`}
              >
                #{tag.name}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <Link to="/habits">Привычки</Link>
        <Link to="/settings">Настройки</Link>
        <button type="button" onClick={onLogout}>
          Выйти
        </button>
      </div>

      {sidebarQuery.isPending && <p className="sidebar-status">Загрузка…</p>}
      {sidebarQuery.isError && (
        <p className="sidebar-status sidebar-error">
          Не удалось загрузить списки: {errorMessage(sidebarQuery.error)}
        </p>
      )}
      {error && <p className="sidebar-status sidebar-error">{error}</p>}
    </aside>
  );
}
