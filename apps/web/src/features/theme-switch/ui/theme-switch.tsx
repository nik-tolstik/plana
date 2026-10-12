import { useState } from "react";
import { userSchema, type UserDto, type UserTheme } from "@plana/shared";
import { apiClient } from "@/shared/api/client";
import { Segmented } from "@/shared/ui";
import { applyTheme, currentTheme } from "../model/theme";

const OPTIONS: Array<{ value: UserTheme; label: string }> = [
  { value: "system", label: "Системная" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

/** Переключатель темы из 3 режимов. Выбранная тема синхронизируется с профилем. */
export function ThemeSwitch({ onUserUpdated }: { onUserUpdated?: (user: UserDto) => void }) {
  const [theme, setTheme] = useState<UserTheme>(currentTheme());

  function select(next: UserTheme) {
    setTheme(next);
    applyTheme(next);
    apiClient
      .patch("/v1/me", userSchema, { theme: next })
      .then(onUserUpdated)
      .catch(() => undefined);
  }

  return (
    <Segmented
      aria-label="Тема оформления"
      name="theme"
      value={theme}
      onChange={select}
      options={OPTIONS}
    />
  );
}
