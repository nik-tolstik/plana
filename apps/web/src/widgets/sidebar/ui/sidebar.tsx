import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FlameIcon, LogOutIcon, PlusIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { useSidebarQuery } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { logout } from "@/features/auth";
import { useCreateFolder, useCreateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { Button, Input } from "@/shared/ui";
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

/** Приход/уход инлайн-форм: раскрытие по высоте + fade. */
function Collapse({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={prefersReducedMotion ? { height: 0, opacity: 0 } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

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
    <aside className="sticky top-0 flex h-dvh w-[264px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-3 max-md:h-auto max-md:w-full max-md:border-r-0 max-md:border-b">
      <Link className="px-2 text-lg font-bold" to="/">
        Plana
      </Link>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const q = search.trim();
          navigate(q.length > 0 ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
      >
        <Input
          aria-label="Поиск задач"
          placeholder="Поиск…"
          prefix={<SearchIcon className="size-3.5" />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </form>

      <nav aria-label="Списки" className="flex min-w-0 flex-1 flex-col gap-3">
        {sidebar ? (
          <div className="flex flex-col gap-0.5">
            <ListRow list={sidebar.inbox} onError={setError} />
            {[...SMART_LINKS, ...SMART_EXTRA].map((link) => (
              <NavLink
                className={({ isActive }) =>
                  `group flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover ${
                    isActive ? "bg-surface-selected" : ""
                  }`
                }
                key={link.to}
                to={link.to}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left">
                  {link.label}
                </span>
              </NavLink>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-0.5">
          {sidebar?.rootLists.map((list) => (
            <ListRow key={list.id} list={list} onError={setError} />
          ))}
          {sidebar?.folders.map((folder) => (
            <FolderGroup key={folder.id} folder={folder} onError={setError} />
          ))}

          <AnimatePresence initial={false}>
            {addingList ? (
              <Collapse key="add-list">
                <AddForm
                  placeholder="Название списка"
                  onSubmit={addList}
                  onCancel={() => setAddingList(false)}
                />
              </Collapse>
            ) : (
              <Button
                key="btn-list"
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setAddingList(true);
                  setAddingFolder(false);
                }}
              >
                <PlusIcon /> Список
              </Button>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {addingFolder ? (
              <Collapse key="add-folder">
                <AddForm
                  placeholder="Название папки"
                  onSubmit={addFolder}
                  onCancel={() => setAddingFolder(false)}
                />
              </Collapse>
            ) : (
              <Button
                key="btn-folder"
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setAddingFolder(true);
                  setAddingList(false);
                }}
              >
                <PlusIcon /> Папка
              </Button>
            )}
          </AnimatePresence>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {tags.map((tag) => (
              <NavLink
                className={({ isActive }) =>
                  `group flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover ${
                    isActive ? "bg-surface-selected" : ""
                  }`
                }
                key={tag.id}
                to={`/tag/${tag.id}`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left">
                  #{tag.name}
                </span>
              </NavLink>
            ))}
          </div>
        ) : null}
      </nav>

      <div className="flex flex-wrap items-center gap-1 border-t border-border pt-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate("/habits")}>
          <FlameIcon className="size-4" /> Привычки
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
          <SettingsIcon className="size-4" /> Настройки
        </Button>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOutIcon className="size-4" /> Выйти
        </Button>
      </div>

      {sidebarQuery.isPending ? <p className="text-sm text-muted-foreground">Загрузка…</p> : null}
      {sidebarQuery.isError ? (
        <p className="text-sm text-destructive">
          Не удалось загрузить списки: {errorMessage(sidebarQuery.error)}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </aside>
  );
}
