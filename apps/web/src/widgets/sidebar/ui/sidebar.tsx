import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useSidebarQuery } from "@/entities/list";
import { logout } from "@/features/auth";
import { useCreateFolder, useCreateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { AddForm } from "./add-form";
import { FolderGroup } from "./folder-group";
import { ListRow } from "./list-row";

/** Умные списки, ожидающие M3 (реальные представления задач). */
const SMART_STUBS = ["Сегодня", "Завтра", "Следующие 7 дней", "Все"];

export function Sidebar() {
  const sidebarQuery = useSidebarQuery();
  const navigate = useNavigate();

  const createList = useCreateList();
  const createFolder = useCreateFolder();

  const [error, setError] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);

  const sidebar = sidebarQuery.data;

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

      <nav aria-label="Списки">
        {sidebar && (
          <div className="sidebar-section">
            <ListRow list={sidebar.inbox} onError={setError} />
            {SMART_STUBS.map((name) => (
              <span className="row row-disabled" key={name} title="Появится в M3">
                {name}
              </span>
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
