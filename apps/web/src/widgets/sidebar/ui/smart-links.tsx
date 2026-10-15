import {
  CalendarCheckIcon,
  CalendarRangeIcon,
  CheckCheckIcon,
  ListTodoIcon,
  SettingsIcon,
  SunriseIcon,
  Trash2Icon,
} from "lucide-react";
import { NavLink } from "react-router";
import { Checkbox, Popover } from "@/shared/ui";
import type { SmartListKey } from "../model/smart-visibility";

export interface SmartLink {
  key: SmartListKey;
  to: string;
  label: string;
  icon: React.ReactNode;
}

/** Умные списки — вычисляемые представления задач (роуты, не хранятся в БД). */
export const SMART_LINKS: SmartLink[] = [
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

/** Строка умного списка (роут). */
export function SmartLinkRow({ link }: { link: SmartLink }) {
  return (
    <NavLink
      className={({ isActive }) =>
        `group flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover ${
          isActive ? "bg-surface-selected" : ""
        }`
      }
      to={link.to}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left">
        <span aria-hidden className="flex size-4 shrink-0 text-muted-foreground">
          {link.icon}
        </span>
        {link.label}
      </span>
    </NavLink>
  );
}

/** Поповер настройки видимости умных списков. */
export function SmartVisibilityButton({
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
