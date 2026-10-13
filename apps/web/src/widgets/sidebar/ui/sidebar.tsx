import { useRef, useState } from "react";
import {
  CalendarCheckIcon,
  CalendarRangeIcon,
  CheckCheckIcon,
  ChevronUpIcon,
  FlameIcon,
  ListTodoIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  SunriseIcon,
  Trash2Icon,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { useSidebarQuery, type ListDto } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { useSessionStore } from "@/entities/user";
import { logout } from "@/features/auth";
import { useCreateTag } from "@/features/tag-manage";
import { useCreateFolder, useCreateList, useUpdateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { Checkbox, EntityMarker, Popover } from "@/shared/ui";
import { AddForm } from "./add-form";
import { FolderGroup } from "./folder-group";
import { ListRow } from "./list-row";
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
          className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
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

/** Заголовок секции сайдбара: маленький каптал + действие справа (плюс/шестерёнка). */
function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-1 pl-2 pr-1">
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
      className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
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

/** Карточка пользователя внизу сайдбара: поповер с привычками, настройками и выходом. */
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
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card p-2 text-left transition-colors hover:bg-surface-hover"
          aria-label="Меню пользователя"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronUpIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu" aria-label="Меню пользователя" className="flex w-48 flex-col p-1">
          <UserMenuItem
            icon={<FlameIcon className="size-4" />}
            label="Привычки"
            onClick={() => {
              close();
              navigate("/habits");
            }}
          />
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

export function Sidebar() {
  const sidebarQuery = useSidebarQuery();
  const tagsQuery = useTagsQuery();
  const navigate = useNavigate();

  const createList = useCreateList();
  const createFolder = useCreateFolder();
  const updateList = useUpdateList();
  const createTag = useCreateTag();

  const [error, setError] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [hiddenSmart, setHiddenSmart] = useState(() => loadHiddenSmartLists());

  // DnD проектов: дроп проекта на проект создаёт папку с обоими.
  // Идентификатор тащимого списка — в ref: dragover/drop приходят до
  // нового рендера, замыкание со стейтом было бы устаревшим.
  const dragListIdRef = useRef<string | null>(null);
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [overListId, setOverListId] = useState<string | null>(null);

  const sidebar = sidebarQuery.data;
  const tags = tagsQuery.data ?? [];

  function toggleSmart(key: SmartListKey) {
    setHiddenSmart((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveHiddenSmartLists(next);
      return next;
    });
  }

  async function addList(name: string) {
    try {
      await createList.mutateAsync({ name });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function addTag(name: string) {
    try {
      await createTag.mutateAsync({ name });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Дроп проекта на проект: создаём папку и кладём в неё оба списка. */
  async function dropListOnList(targetId: string) {
    const sourceId = dragListIdRef.current;
    dragListIdRef.current = null;
    setDragListId(null);
    setOverListId(null);
    if (!sourceId || sourceId === targetId) return;
    try {
      const folder = await createFolder.mutateAsync({ name: "Новая папка" });
      await updateList.mutateAsync({ listId: sourceId, input: { folderId: folder.id } });
      await updateList.mutateAsync({ listId: targetId, input: { folderId: folder.id } });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const rootLists = sidebar?.rootLists ?? [];
  const listDnd = (list: ListDto) => ({
    dragging: dragListId === list.id,
    over: overListId === list.id && dragListId !== null && dragListId !== list.id,
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
      setOverListId(list.id);
    },
    onDragLeave: () => setOverListId((current) => (current === list.id ? null : current)),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      void dropListOnList(list.id);
    },
    onDragEnd: () => {
      dragListIdRef.current = null;
      setDragListId(null);
      setOverListId(null);
    },
  });

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
            <ListRow list={sidebar.inbox} onError={setError} />
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

        <section className="flex flex-col gap-0.5">
          <SectionHeader
            label="Проекты"
            action={
              <HeaderIconButton title="Добавить проект" onClick={() => setAddingList(true)}>
                <PlusIcon className="size-3.5" />
              </HeaderIconButton>
            }
          />
          {rootLists.map((list) => (
            <ListRow key={list.id} list={list} onError={setError} dnd={listDnd(list)} />
          ))}
          {sidebar?.folders.map((folder) => (
            <FolderGroup key={folder.id} folder={folder} onError={setError} />
          ))}
          {addingList ? (
            <AddForm
              placeholder="Название проекта"
              onSubmit={addList}
              onCancel={() => setAddingList(false)}
            />
          ) : null}
          {rootLists.length === 0 && !sidebar?.folders.length ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Перетащите один проект на другой, чтобы собрать папку
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-0.5">
          <SectionHeader
            label="Теги"
            action={
              <HeaderIconButton title="Добавить тег" onClick={() => setAddingTag(true)}>
                <PlusIcon className="size-3.5" />
              </HeaderIconButton>
            }
          />
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
                <EntityMarker icon={tag.icon} color={tag.color} />
                <span className="truncate">{tag.name}</span>
              </span>
            </NavLink>
          ))}
          {addingTag ? (
            <AddForm
              placeholder="Название тега"
              onSubmit={addTag}
              onCancel={() => setAddingTag(false)}
            />
          ) : null}
        </section>
      </nav>

      <UserCard onLogout={onLogout} />

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
