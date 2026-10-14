import { useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  CalendarCheckIcon,
  CalendarRangeIcon,
  CheckCheckIcon,
  FlameIcon,
  FolderPlusIcon,
  ListTodoIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  SunriseIcon,
  Trash2Icon,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import type { ListDto, PatchListDto } from "@plana/shared";
import { useSidebarQuery } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { useSessionStore } from "@/entities/user";
import { logout } from "@/features/auth";
import { useUpdateTask } from "@/features/task-manage";
import { useUpdateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { TASK_DRAG_MIME } from "@/shared/lib/task-drag-mime";
import { Checkbox, Popover } from "@/shared/ui";
import { CreateEntityDialog, type CreateEntityKind } from "./create-entity-dialog";
import { FolderGroup } from "./folder-group";
import { ListRow } from "./list-row";
import { TagRow } from "./tag-row";
import {
  loadHiddenSmartLists,
  saveHiddenSmartLists,
  type SmartListKey,
} from "../model/smart-visibility";

interface SmartLink {
  key: SmartListKey;
  to: string;
  label: string;
  icon: React.ReactNode;
}

/** Умные списки — вычисляемые представления задач (роуты, не хранятся в БД). */
const SMART_LINKS: SmartLink[] = [
  {
    key: "today",
    to: "/today",
    label: "Сегодня",
    icon: <CalendarCheckIcon aria-hidden className="size-4" />,
  },
  {
    key: "tomorrow",
    to: "/tomorrow",
    label: "Завтра",
    icon: <SunriseIcon aria-hidden className="size-4" />,
  },
  {
    key: "next7",
    to: "/next7",
    label: "Следующие 7 дней",
    icon: <CalendarRangeIcon aria-hidden className="size-4" />,
  },
  { key: "all", to: "/all", label: "Все", icon: <ListTodoIcon aria-hidden className="size-4" /> },
  {
    key: "completed",
    to: "/completed",
    label: "Завершённые",
    icon: <CheckCheckIcon aria-hidden className="size-4" />,
  },
  {
    key: "trash",
    to: "/trash",
    label: "Корзина",
    icon: <Trash2Icon aria-hidden className="size-4" />,
  },
];

function SmartVisibilityButton({
  hidden,
  onToggle,
}: {
  hidden: Set<SmartListKey>;
  onToggle: (key: SmartListKey) => void;
}) {
  return (
    <Popover
      placement="bottom-start"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
          title="Настройки умных списков"
          aria-label="Настройки умных списков"
        >
          <SettingsIcon className="size-3.5" />
        </button>
      )}
    >
      <div className="flex w-56 flex-col gap-0.5 p-2">
        <p className="px-2 pb-1 text-xs text-muted-foreground">Показывать в сайдбаре</p>
        {SMART_LINKS.map((link) => (
          <label
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-option-hover"
            key={link.key}
          >
            <Checkbox
              checked={!hidden.has(link.key)}
              onCheckedChange={() => onToggle(link.key)}
              aria-label={link.label}
            />
            {link.label}
          </label>
        ))}
      </div>
    </Popover>
  );
}

interface SectionHeaderDndProps {
  over: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
}

/** Заголовок секции сайдбара: маленький каптал + действия справа; может быть drop-целью. */
function SectionHeader({
  label,
  action,
  dnd,
}: {
  label: string;
  action?: React.ReactNode;
  dnd?: SectionHeaderDndProps;
}) {
  return (
    <div
      className={cn(
        "flex min-h-7 items-center justify-between gap-1 rounded-md pl-2 pr-1 transition-colors",
        dnd?.over && "bg-surface-selected",
      )}
      onDragOver={dnd?.onDragOver}
      onDragLeave={dnd?.onDragLeave}
      onDrop={dnd?.onDrop}
    >
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {action}
    </div>
  );
}

function HeaderIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** Пункт меню карточки пользователя. */
function UserMenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-option-hover ${
        danger ? "text-destructive hover:bg-destructive/10" : ""
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}

/** Карточка пользователя внизу сайдбара: поповер с настройками и выходом. */
function UserCard({ onLogout }: { onLogout: () => void }) {
  const user = useSessionStore((state) => state.user);
  const navigate = useNavigate();
  if (!user) return null;
  const initial = (user.name?.trim() || user.email || "?").charAt(0).toUpperCase();

  return (
    <Popover
      placement="top-start"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-surface-hover"
          aria-label="Меню пользователя"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu" aria-label="Меню пользователя" className="flex w-48 flex-col p-1">
          <UserMenuItem
            icon={<SettingsIcon className="size-4" />}
            label="Настройки"
            onClick={() => {
              close();
              navigate("/settings");
            }}
          />
          <UserMenuItem
            icon={<LogOutIcon className="size-4" />}
            label="Выйти"
            danger
            onClick={() => {
              close();
              onLogout();
            }}
          />
        </div>
      )}
    </Popover>
  );
}

/** Куда встанет тащимый список. */
type DropTarget =
  | { type: "list"; id: string; edge: "before" | "after" }
  | { type: "folder"; id: string }
  | { type: "root" }
  | null;

export function Sidebar() {
  const sidebarQuery = useSidebarQuery();
  const tagsQuery = useTagsQuery();
  const navigate = useNavigate();
  const updateList = useUpdateList();
  const prefersReducedMotion = useReducedMotion();

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<CreateEntityKind | null>(null);
  const [hiddenSmart, setHiddenSmart] = useState(() => loadHiddenSmartLists());

  // DnD проектов: сортировка и перенос между корнем и папками. Идентификатор
  // тащимого списка — в ref: dragover/drop приходят до нового рендера,
  // замыкание со стейтом было бы устаревшим.
  const dragListIdRef = useRef<string | null>(null);
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  // Дроп перетащенной задачи на строку списка — перенос задачи в этот список.
  const updateTask = useUpdateTask();
  const [taskOverListId, setTaskOverListId] = useState<string | null>(null);

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

  // --- DnD ---

  const findList = (listId: string | null): ListDto | undefined => {
    if (!sidebar || !listId) return undefined;
    return [sidebar.inbox, ...sidebar.rootLists, ...sidebar.folders.flatMap((f) => f.lists)].find(
      (candidate) => candidate.id === listId,
    );
  };

  /**
   * Соседи контейнера (null = корень) без тащимого списка. Для корня Inbox
   * тоже сосед (API нумерует корень вместе с ним, position 0) — иначе
   * пересчёт индекса вставки смещается на единицу.
   */
  const siblingsOf = (folderId: string | null, withoutId: string): ListDto[] => {
    if (!sidebar) return [];
    const lists =
      folderId === null
        ? [sidebar.inbox, ...sidebar.rootLists]
        : (sidebar.folders.find((f) => f.id === folderId)?.lists ?? []);
    return lists.filter((list) => list.id !== withoutId);
  };

  function clearDrag() {
    dragListIdRef.current = null;
    setDragListId(null);
    setDropTarget(null);
  }

  /** Дроп на список: встаём выше/ниже цели в её контейнере. */
  async function dropOnList(targetId: string, edge: "before" | "after") {
    const sourceId = dragListIdRef.current;
    clearDrag();
    const source = findList(sourceId);
    const target = findList(targetId);
    if (!source || !target || source.id === target.id) return;
    const containerId = target.folderId;
    const siblings = siblingsOf(containerId, source.id);
    const targetIndex = siblings.findIndex((list) => list.id === target.id);
    if (targetIndex < 0) return;
    const input: PatchListDto = { position: edge === "after" ? targetIndex + 1 : targetIndex };
    if (source.folderId !== containerId) {
      input.folderId = containerId;
    }
    try {
      await updateList.mutateAsync({ listId: source.id, input });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Дроп на шапку папки: кладём тащимый список в конец этой папки. */
  async function dropOnFolder(folderId: string) {
    const sourceId = dragListIdRef.current;
    clearDrag();
    const source = findList(sourceId);
    if (!source || source.folderId === folderId) return;
    try {
      await updateList.mutateAsync({ listId: source.id, input: { folderId } });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Дроп на заголовок «Проекты»: выносим список из папки в конец корня. */
  async function dropOnRoot() {
    const sourceId = dragListIdRef.current;
    clearDrag();
    const source = findList(sourceId);
    if (!source || source.folderId === null) return;
    try {
      await updateList.mutateAsync({ listId: source.id, input: { folderId: null } });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const listDnd = (list: ListDto) => ({
    dragging: dragListId === list.id,
    edge:
      dropTarget?.type === "list" && dropTarget.id === list.id && dragListId !== null
        ? dropTarget.edge
        : null,
    onDragStart: (event: React.DragEvent) => {
      dragListIdRef.current = list.id;
      setDragListId(list.id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", list.id);
    },
    onDragOver: (event: React.DragEvent) => {
      const sourceId = dragListIdRef.current;
      if (sourceId === null || sourceId === list.id) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const rect = event.currentTarget.getBoundingClientRect();
      const edge: "before" | "after" =
        event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      setDropTarget((current) =>
        current?.type === "list" && current.id === list.id && current.edge === edge
          ? current
          : { type: "list", id: list.id, edge },
      );
    },
    onDragLeave: () =>
      setDropTarget((current) =>
        current?.type === "list" && current.id === list.id ? null : current,
      ),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      // edge считаем по геометрии на момент дропа: state мог не закоммититься.
      const rect = event.currentTarget.getBoundingClientRect();
      const edge: "before" | "after" =
        event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      void dropOnList(list.id, edge);
    },
    onDragEnd: clearDrag,
  });

  const folderDnd = (folderId: string) => ({
    overFolder: dropTarget?.type === "folder" && dropTarget.id === folderId && dragListId !== null,
    onHeaderDragOver: (event: React.DragEvent) => {
      const sourceId = dragListIdRef.current;
      if (sourceId === null) return;
      const source = findList(sourceId);
      if (!source || source.folderId === folderId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget({ type: "folder", id: folderId });
    },
    onHeaderDragLeave: () =>
      setDropTarget((current) =>
        current?.type === "folder" && current.id === folderId ? null : current,
      ),
    onHeaderDrop: (event: React.DragEvent) => {
      event.preventDefault();
      void dropOnFolder(folderId);
    },
  });

  /** Приём дропа задачи на строку списка (включая Inbox). */
  const taskDropFor = (list: ListDto) => ({
    over: taskOverListId === list.id,
    onDragOver: (event: React.DragEvent) => {
      if (!event.dataTransfer.types.includes(TASK_DRAG_MIME)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setTaskOverListId(list.id);
    },
    onDragLeave: () => setTaskOverListId((current) => (current === list.id ? null : current)),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      const taskId = event.dataTransfer.getData(TASK_DRAG_MIME);
      setTaskOverListId(null);
      if (!taskId) return;
      // Сервер ставит задачу в конец целевого списка (position не задан).
      updateTask
        .mutateAsync({ taskId, listId: list.id, sectionId: null })
        .catch((cause) => setError(errorMessage(cause)));
    },
  });

  const rootDnd = {
    over: dropTarget?.type === "root" && dragListId !== null,
    onDragOver: (event: React.DragEvent) => {
      const sourceId = dragListIdRef.current;
      if (sourceId === null) return;
      const source = findList(sourceId);
      if (!source || source.folderId === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget({ type: "root" });
    },
    onDragLeave: () => setDropTarget((current) => (current?.type === "root" ? null : current)),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      void dropOnRoot();
    },
  };

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
                  <span aria-hidden className="flex size-4 shrink-0 text-muted-foreground">
                    {link.icon}
                  </span>
                  {link.label}
                </span>
              </NavLink>
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
