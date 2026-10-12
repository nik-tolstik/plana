# Plana — архитектура фронтенда: Feature-Sliced Design (FSD)

Решение владельца от 2026-10-09: фронтенд строится по методологии [Feature-Sliced Design v2](https://feature-sliced.design/ru/). Методология обязательна для всего кода `apps/web`.

## Слои и их назначение

Каталог `apps/web/src`, сверху вниз. **Слой может импортировать только из слоёв ниже.** Нарушение — ошибка, ломающая сборку логики проекта.

| Слой       | Назначение                                                 | Наши слайсы                                                                                                                         |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `app`      | Инициализация: провайдеры, роутинг, глобальные стили,(env) | — (без слайсов)                                                                                                                     |
| `pages`    | Страницы роутинга                                          | `home` (задачи), `habits`, `settings`, `login`                                                                                      |
| `widgets`  | Крупные самостоятельные блоки страницы                     | `task-list-panel`, `task-details-panel`, `sidebar`, `habit-calendar`, `quick-add`                                                   |
| `features` | Пользовательские действия (обычно одно на слайс)           | `auth`, `task-create`, `task-complete`, `task-edit`, `parse-date-input`, `push-subscribe`, `theme-switch`, `file-upload`            |
| `entities` | Бизнес-сущности: их типы, API-запросы, UI-компоненты       | `task`, `subtask`, `list`, `folder`, `section`, `tag`, `habit`, `attachment`, `user`, `reminder`                                    |
| `shared`   | Переиспользуемая инфраструктура без бизнес-логики          | `api` (клиент), `ui` (примитивы дизайн-системы), `lib` (утилиты, `cn`), `config` (env, константы), `styles` (Tailwind, токены темы) |

## Слайсы и сегменты

- Слайс = каталог внутри слоя (название в kebab-case: `entities/task`, `features/task-complete`).
- Сегменты внутри слайса (по необходимости, не все сразу): `ui` (компоненты), `api` (запросы), `model` (состояние: zustand-сторы, query-ключи), `lib` (логика слайса), `config`.
- **Public API**: другие слайсы импортируют только через корень слайса — `import { TaskCard } from '@/entities/task'`. Файл `index.ts` слайса — единственная точка экспорта. Импорт внутрь чужого слайса (`@/entities/task/ui/...`) запрещён.
- Импорт между слайсами **одного слоя запрещён** (`entities/task` не может импортировать `entities/list` — общее выносится ниже). Практическое исключение для MVP: типы из `@plana/shared` и перекрёстные ссылки через ID, а не через импорты.

Псевдоним путей: `@/` → `apps/web/src/`.

## Правила для нашего стека

- **TanStack Query**: хуки запросов живут в `entities/*/api` и `features/*/api`. Query-ключи — фабрики в `entities/*/model/keys.ts` (`taskKeys.list(filters)`, `taskKeys.detail(id)`). Мутации, меняющие задачи, инвалидируют через эти ключи.
- **Zod**: контракты и enum'ы — в `@plana/shared`, не дублируются в `entities`. `entities/task/model/types.ts` только расширяет их клиентскими типами.
- **Роутинг**: react-router, дерево маршрутов в `app/routes`. Страницы не знают друг о друге.
- **Стили**: Tailwind CSS 4 (`@tailwindcss/postcss`, токены через `@theme inline` в `shared/styles/globals.css`) + дизайн-токены по `docs/design/design-system.md`. Примитивы (Button, Input, Checkbox, Segmented, Dialog, …) — в `shared/ui`; компоненты выше используют только их, а не голые элементы с классами. Radix/Base UI нет — примитивы свои (Checkbox/Segmented на motion, Dialog на floating-ui).
- **Анимации**: `motion` ^12 (импорт `motion/react`). Паттерны и параметры (fade+rise, stagger, spring-галочка, collapse) — в `docs/design/design-system.md`; везде `useReducedMotion`. `AnimatePresence` обязателен для уходов.
- **Витрина**: Storybook 10 (`pnpm --filter web storybook`, стори в `shared/ui/stories`), тулбар темы light/dark, addon-a11y.
- **Шрифт**: Onest Variable (`@fontsource-variable/onest`).
- **Тема (system/light/dark)**: переключатель — `features/theme-switch`, применение — класс на `<html>` + CSS-переменные в `shared/styles`; выбор хранится в профиле (при синхронизации) и localStorage (до загрузки профиля, чтобы не мигало).
- **Env**: только через `shared/config/env.ts` (zod-схема `import.meta.env`); `import.meta.env` в остальных местах запрещён.

## Проверка правил

Автопроверка импортов FSD линтером в MVP не подключена (oxlint не имеет готового плагина layers). Правила соблюдаются ревью и простым скриптом проверки алиасов (добавим при необходимости). Нарушение правил импортов — ошибка, а не стилистическое замечание.

## Каркас каталога (уже создан в скелете)

```
apps/web/src/
  app/          providers/, routes/
  pages/        home/, habits/, settings/, login/
  widgets/      (заполняется при реализации UI)
  features/     (заполняется при реализации)
  entities/     task/, list/, ... (api+model заготовки)
  shared/       api/, ui/, lib/, config/, styles/
  main.tsx
```
