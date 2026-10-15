import { LogOutIcon, SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { useSessionStore } from "@/entities/user";
import { Popover } from "@/shared/ui";

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
export function UserCard({ onLogout }: { onLogout: () => void }) {
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
