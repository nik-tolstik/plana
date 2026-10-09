# Plana

Веб-планировщик задач (MVP по мотивам TickTick): задачи с повторами и приоритетами, списки/папки/теги, трекер привычек, вложения, web-push напоминания. Только web (desktop + mobile), PWA. Интерфейс — русский.

Проект пишется AI-агентами, поэтому **вся документация в `docs/` — часть контракта**: перед изменениями сверяйтесь с ней, после решений — обновляйте.

## Стек

| Слой                                | Технологии                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (`apps/web`)               | React 19, Vite 8, TypeScript 5.9 (strict), TanStack Query 5, react-router 8, архитектура FSD; UI: Tailwind + Base UI (на этапе дизайна) |
| Backend (`apps/api`)                | NestJS 12, TypeScript, Drizzle ORM → PostgreSQL 16+                                                                                     |
| Общие контракты (`packages/shared`) | zod-схемы и типы, переиспользуются фронтом и бэком                                                                                      |
| Инструменты                         | pnpm workspaces, oxlint + oxfmt, Vitest 5, Supertest, Playwright (позже)                                                                |
| Деплой                              | Frontend — Vercel (один проект, ветки main/develop); Backend+БД — Railway (один проект, окружения develop/production)                   |

Node 24 LTS.

## Команды

```bash
pnpm install            # установка
pnpm dev:web            # фронт: http://localhost:5173
pnpm dev:api            # API: http://localhost:3000/v1/health (с watch shared)
pnpm lint               # oxlint
pnpm format             # oxfmt (форматирование, --check — проверка)
pnpm typecheck          # tsc --noEmit во всех пакетах
pnnpm test              # vitest во всех пакетах
pnpm build              # сборка shared → api + web
```

Для API: `apps/api/.env.example` → скопировать в `apps/api/.env`.

## Структура

```
apps/
  web/        # фронтенд (FSD: app/pages/widgets/features/entities/shared)
  api/        # NestJS API (модули в src/modules)
packages/
  shared/     # zod-контракты (источник истины типов)
  config/     # общие tsconfig
docs/
  mvp-scope.md            # канонический скоуп MVP
  decisions.md            # журнал решений
  architecture/
    erd.md                # схема БД
    api.md                # структура API
    frontend.md           # правила FSD
  deploy.md               # настройка Vercel/Railway
  research/               # исследования (TickTick, backend-стек)
  questions/              # реестр вопросов системного дизайна
```

## Работа с git

Conventional commits; ветки `feat/...`, `fix/...`, `chore/...`; прямые пуши в `main` запрещены; `develop` → staging-окружения, `main` → production (merge только через PR). CI на каждый PR: lint + format + typecheck + test + build.
