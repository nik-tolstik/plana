import { useState } from "react";
import type { UserTheme } from "@plana/shared";
import { useUpdateUser } from "@/entities/user";
import { Segmented } from "@/shared/ui";
import { applyTheme, currentTheme } from "../model/theme";

const OPTIONS: Array<{ value: UserTheme; label: string }> = [
  { value: "system", label: "Системная" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

/** Переключатель темы из 3 режимов. Выбранная тема синхронизируется с профилем. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<UserTheme>(currentTheme);
  const updateUser = useUpdateUser();

  function select(next: UserTheme) {
    const previous = theme;
    setTheme(next);
    applyTheme(next);
    // Сервер не подтвердил — возвращаем выбор, чтобы UI не врал о профиле.
    updateUser.mutate(
      { theme: next },
      {
        onError: () => {
          setTheme(previous);
          applyTheme(previous);
        },
      },
    );
  }

  return (
    <Segmented
      aria-label="Тема оформления"
      name="theme"
      value={theme}
      onChange={select}
      options={OPTIONS}
      // По ширине контента: без растяжения на всю колонку страницы.
      className="self-start"
    />
  );
}
