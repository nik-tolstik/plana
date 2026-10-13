/** Настройки отображения страницы списка: группировка и порядок задач. */
export type ListGroupMode = "none" | "date" | "priority";
export type ListSortMode = "manual" | "date" | "priority" | "title";

export interface ListDisplaySettings {
  group: ListGroupMode;
  sort: ListSortMode;
}

export const DEFAULT_LIST_DISPLAY: ListDisplaySettings = { group: "none", sort: "manual" };

const GROUP_MODES: ListGroupMode[] = ["none", "date", "priority"];
const SORT_MODES: ListSortMode[] = ["manual", "date", "priority", "title"];

const storageKey = (listId: string) => `plana.listDisplay.${listId}`;

/** Настройки списка из localStorage; мусор или отсутствие → дефолт. */
export function loadListDisplay(listId: string): ListDisplaySettings {
  try {
    const raw = localStorage.getItem(storageKey(listId));
    if (raw === null) return DEFAULT_LIST_DISPLAY;
    const parsed = JSON.parse(raw) as Partial<ListDisplaySettings>;
    const group = GROUP_MODES.includes(parsed.group as ListGroupMode)
      ? (parsed.group as ListGroupMode)
      : DEFAULT_LIST_DISPLAY.group;
    const sort = SORT_MODES.includes(parsed.sort as ListSortMode)
      ? (parsed.sort as ListSortMode)
      : DEFAULT_LIST_DISPLAY.sort;
    return { group, sort };
  } catch {
    return DEFAULT_LIST_DISPLAY;
  }
}

export function saveListDisplay(listId: string, settings: ListDisplaySettings): void {
  try {
    localStorage.setItem(storageKey(listId), JSON.stringify(settings));
  } catch {
    // localStorage недоступен (приватный режим) — настройки живут до перезагрузки.
  }
}
