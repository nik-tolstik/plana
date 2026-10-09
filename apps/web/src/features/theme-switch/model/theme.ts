import type { UserTheme } from "@plana/shared";

const THEME_KEY = "plana.theme";

function isUserTheme(value: string | null): value is UserTheme {
  return value === "system" || value === "light" || value === "dark";
}

/** Применяет тему: класс на <html> (см. shared/styles/global.css) + сохранение выбора. */
export function applyTheme(theme: UserTheme): void {
  localStorage.setItem(THEME_KEY, theme);
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

export function currentTheme(): UserTheme {
  const saved = localStorage.getItem(THEME_KEY);
  return isUserTheme(saved) ? saved : "system";
}

/** Вызывается до первого рендера, чтобы тема не мигала. */
export function initTheme(): void {
  applyTheme(currentTheme());
}
