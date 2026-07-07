# AGENTS.md

## Основные правила

- Используй `pnpm` через Corepack: `corepack pnpm ...`.
- Не используй `npm` или `yarn`, если проект явно не будет переведен на них отдельным решением.
- Работай в интерактивном `zsh`.
- Все комментарии в коде пиши на английском.
- Перед изменением архитектуры проверь [docs/architecture.md](docs/architecture.md).
- Если архитектура, слой FSD, стек или ключевой workflow изменились, обнови [docs/architecture.md](docs/architecture.md) в той же задаче.

## Архитектурные правила

- Проект использует FSD-подход. Новую бизнес-логику размещай в слоях `pages`, `widgets`, `features`, `entities`, `shared` по назначению.
- `src/routes` оставляй тонким routing-adapter слоем TanStack Router: route-файлы должны подключать компоненты страниц и route-specific loader/action код, а не содержать крупную UI или бизнес-логику.
- Общие провайдеры приложения держи в `src/app/providers`.
- Общую инфраструктуру API, query keys, HTTP-клиенты и адаптеры держи в `src/shared/api`.
- UI строится на Tailwind CSS и Base UI (`@base-ui/react`). Base UI компоненты стилизуй через Tailwind-классы или локальные CSS-слои.
- Для серверного состояния используй TanStack Query. Не создавай новый `QueryClient` внутри компонентов.
- Для форм используй `react-hook-form`, схемы валидации описывай через `zod`, связывай их через `@hookform/resolvers/zod`.

## Проверки

- После изменений запускай релевантные проверки:
  - `corepack pnpm lint`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm test:e2e`, если менялся пользовательский поток или роутинг
- Для форматирования используй `corepack pnpm format`.
