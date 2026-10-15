import { useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { FlameIcon, FolderPlusIcon, PlusIcon } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { useSidebarQuery } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { logout } from "@/features/auth";
import { errorMessage } from "@/shared/lib/error-message";
import { CreateEntityDialog, type CreateEntityKind } from "./create-entity-dialog";
import { FolderGroup } from "./folder-group";
import { ListRow } from "./list-row";
import { HeaderIconButton, SectionHeader } from "./section-header";
import { SMART_LINKS, SmartLinkRow, SmartVisibilityButton } from "./smart-links";
import { TagRow } from "./tag-row";
import { UserCard } from "./user-card";
import { useSidebarDnd } from "../model/use-sidebar-dnd";
import {
  loadHiddenSmartLists,
  saveHiddenSmartLists,
  type SmartListKey,
} from "../model/smart-visibility";

/** Левая навигация: умные списки, проекты (с DnD), теги, привычки, профиль. */
export function Sidebar() {
  const sidebarQuery = useSidebarQuery();
  const tagsQuery = useTagsQuery();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<CreateEntityKind | null>(null);
  const [hiddenSmart, setHiddenSmart] = useState(() => loadHiddenSmartLists());

  const { listDnd, folderDnd, taskDropFor, rootDnd } = useSidebarDnd(sidebarQuery.data, setError);

  const sidebar = sidebarQuery.data;
  const tags = tagsQuery.data ?? [];
  const rootLists = sidebar?.rootLists ?? [];

  function toggleSmart(key: SmartListKey) {
    setHiddenSmart((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveHiddenSmartLists(next);
      return next;
    });
  }

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // layout-анимация перестановок; layoutId — плавный переезд между корнем и папкой.
  const layoutEnabled = !prefersReducedMotion;

  return (
    <aside className="sticky top-0 flex h-dvh w-[264px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-3 max-md:h-auto max-md:w-full max-md:border-r-0 max-md:border-b">
      <Link className="px-2 text-lg font-bold" to="/">
        Plana
      </Link>

      <nav aria-label="Списки" className="flex min-w-0 flex-1 flex-col gap-4">
        {sidebar ? (
          <section className="flex flex-col gap-0.5">
            <SectionHeader
              label="Умные списки"
              action={<SmartVisibilityButton hidden={hiddenSmart} onToggle={toggleSmart} />}
            />
            <ListRow
              list={sidebar.inbox}
              onError={setError}
              taskDrop={taskDropFor(sidebar.inbox)}
            />
            {SMART_LINKS.filter((link) => !hiddenSmart.has(link.key)).map((link) => (
              <SmartLinkRow key={link.to} link={link} />
            ))}
          </section>
        ) : null}

        <LayoutGroup>
          <section className="flex flex-col gap-0.5">
            <SectionHeader
              label="Проекты"
              dnd={rootDnd}
              action={
                <span className="flex gap-0.5">
                  <HeaderIconButton title="Добавить папку" onClick={() => setCreating("folder")}>
                    <FolderPlusIcon className="size-3.5" />
                  </HeaderIconButton>
                  <HeaderIconButton title="Добавить проект" onClick={() => setCreating("list")}>
                    <PlusIcon className="size-3.5" />
                  </HeaderIconButton>
                </span>
              }
            />
            {rootLists.map((list) => (
              <motion.div
                key={list.id}
                layout={layoutEnabled}
                layoutId={layoutEnabled ? list.id : undefined}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <ListRow
                  list={list}
                  onError={setError}
                  dnd={listDnd(list)}
                  taskDrop={taskDropFor(list)}
                />
              </motion.div>
            ))}
            {sidebar?.folders.map((folder) => (
              <FolderGroup
                key={folder.id}
                folder={folder}
                onError={setError}
                dndFor={listDnd}
                taskDropFor={taskDropFor}
                folderDnd={folderDnd(folder.id)}
              />
            ))}
          </section>
        </LayoutGroup>

        <section className="flex flex-col gap-0.5">
          <SectionHeader
            label="Теги"
            action={
              <HeaderIconButton title="Добавить тег" onClick={() => setCreating("tag")}>
                <PlusIcon className="size-3.5" />
              </HeaderIconButton>
            }
          />
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onError={setError} />
          ))}
        </section>
      </nav>

      <div className="flex flex-col gap-1">
        <NavLink
          className={({ isActive }) =>
            `flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover ${
              isActive ? "bg-surface-selected" : ""
            }`
          }
          to="/habits"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left">
            <FlameIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            Привычки
          </span>
        </NavLink>
        <UserCard onLogout={onLogout} />
      </div>

      <CreateEntityDialog
        kind={creating ?? "list"}
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        onError={setError}
      />

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
