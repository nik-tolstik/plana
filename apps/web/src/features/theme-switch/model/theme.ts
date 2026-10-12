import type { UserTheme } from "@plana/shared";

const THEME_KEY = "plana.theme";
const DARK_MEDIA = "(prefers-color-scheme: dark)";

function isUserTheme(value: string | null): value is UserTheme {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Тема: <html> всегда носит явный класс .light/.dark (system резолвится
 * через matchMedia) — дизайн-токены переключаются только по классу, без
 * дублирования media-запросов в CSS.
 */
export function applyTheme(theme: UserTheme): void {
  localStorage.setItem(THEME_KEY, theme);
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_MEDIA).matches);
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
}

export function currentTheme(): UserTheme {
  const saved = localStorage.getItem(THEME_KEY);
  return isUserTheme(saved) ? saved : "system";
}

/** Подписка на смену системной темы, пока выбран режим «Системная». */
export function watchSystemTheme(): () => void {
  const media = window.matchMedia(DARK_MEDIA);
  const onChange = () => {
    if (currentTheme() === "system") {
      applyTheme("system");
    }
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Вызывается до первого рендера, чтобы тема не мигала. */
export function initTheme(): void {
  applyTheme(currentTheme());
}
