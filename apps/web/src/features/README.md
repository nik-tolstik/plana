# Слой features

Пользовательские действия, по одному слайсу на действие: `task-create`, `task-complete`, `auth`, `theme-switch`, `push-subscribe`, `parse-date-input` и т.д.

Правила FSD обязательны: см. [docs/architecture/frontend.md](../../../../docs/architecture/frontend.md). Кратко:

- сегменты слайса: `ui`, `api`, `model`, `lib`;
- публичный API — через `index.ts` слайса;
- импорт только из нижележащих слоёв (`entities`, `shared`);
- импорты между слайсами одного слоя запрещены.
