import type { SmartListKey as AllSmartListKey } from "@plana/shared";

/**
 * Видимость умных списков в сайдбаре (локальная настройка браузера).
 * Inbox не скрывается — это системный список по умолчанию.
 */
export type SmartListKey = Exclude<AllSmartListKey, "inbox">;

const STORAGE_KEY = "plana.hiddenSmartLists";

export const SMART_LIST_KEYS: SmartListKey[] = [
  "today",
  "tomorrow",
  "next7",
  "all",
  "completed",
  "trash",
];

export function loadHiddenSmartLists(): Set<SmartListKey> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((key): key is SmartListKey => SMART_LIST_KEYS.includes(key)));
  } catch {
    return new Set();
  }
}

export function saveHiddenSmartLists(keys: Iterable<SmartListKey>): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // localStorage недоступен — настройка живёт до перезагрузки
  }
}
