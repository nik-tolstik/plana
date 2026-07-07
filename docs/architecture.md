# Архитектура проекта

## Назначение

`plana` - React-приложение на TanStack Start. Проект использует file-based routing TanStack Router, Tailwind CSS v4 для стилей, Base UI для headless-компонентов, TanStack Query для серверного состояния и FSD как файловую архитектуру.

Этот документ является рабочим архитектурным контрактом для будущих агентов. Если фактическая архитектура меняется, документ нужно обновлять в той же задаче.

## Текущий стек

- Runtime и сборка: Vite + TanStack Start.
- UI: React 19, Tailwind CSS v4, Base UI (`@base-ui/react`), `lucide-react`.
- Роутинг: TanStack Router с генерацией `src/routeTree.gen.ts`.
- Server state: TanStack Query.
- Database: PostgreSQL for persistence, configured locally through Docker Compose.
- ORM/migrations: Drizzle ORM and Drizzle Kit.
- Формы: `react-hook-form`, `zod`, `@hookform/resolvers`.
- Unit/integration testing: Vitest + Testing Library.
- E2E testing: Playwright.
- Component workshop/documentation: Storybook with the React Vite framework.
- Качество кода: ESLint flat config, Prettier.
- Package manager: `pnpm` через Corepack.

## FSD-слои

Проект следует Feature-Sliced Design. Слои идут сверху вниз:

- `src/app` - инициализация приложения, провайдеры, глобальные настройки.
- `src/pages` - страницы, собираемые для роутов.
- `src/widgets` - крупные самостоятельные блоки страниц.
- `src/features` - пользовательские сценарии и действия.
- `src/entities` - доменные сущности и их модель.
- `src/shared` - переиспользуемая инфраструктура, UI-примитивы, API-клиенты, утилиты.

Дополнительно:

- `src/routes` - adapter-слой TanStack Router. Route-файлы должны оставаться тонкими и импортировать страницы из `src/pages`.
- `src/routeTree.gen.ts` - generated-файл TanStack Router. Его не редактируют вручную.
- `src/styles.css` - глобальные стили и подключение Tailwind.

## Текущая структура

```text
drizzle/
  meta/
    _journal.json
src/
  app/
    providers/
      query-provider.tsx
      index.ts
  pages/
    home/
      ui/
        home-page.tsx
      index.ts
  routes/
    __root.tsx
    index.tsx
  shared/
    api/
      query-client.ts
    db/
      client.ts
      index.ts
      schema.ts
  routeTree.gen.ts
  router.tsx
  styles.css
```

## Роутинг

TanStack Router использует route-файлы в `src/routes`. Роут `/` объявлен в `src/routes/index.tsx` и рендерит `HomePage` из `src/pages/home`.

`src/routes/__root.tsx` задает HTML shell, global head, scripts и глобальные devtools. На этом же уровне подключается `QueryProvider`, чтобы TanStack Query был доступен всем страницам.

После добавления или изменения route-файлов запускай:

```bash
corepack pnpm generate-routes
```

## Server State

TanStack Query подключен через:

- `src/shared/api/query-client.ts` - фабрика и browser singleton для `QueryClient`;
- `src/app/providers/query-provider.tsx` - `QueryClientProvider` и React Query Devtools.

Новые запросы размещай рядом с доменом:

- entity-specific запросы - в `src/entities/<entity>/api`;
- feature-specific запросы - в `src/features/<feature>/api`;
- общие API-клиенты и query key helpers - в `src/shared/api`.

Не создавай `new QueryClient()` внутри route/page/feature компонентов.

## Database

Локальная PostgreSQL база запускается через `docker-compose.yml`.

Default connection string:

```bash
postgresql://plana:plana@localhost:5432/plana
```

Drizzle ORM подключен как persistence layer:

- `drizzle.config.ts` - конфигурация Drizzle Kit, схема и папка миграций;
- `src/shared/db/client.ts` - общий Drizzle client для server-side кода;
- `src/shared/db/schema.ts` - entrypoint для таблиц Drizzle.

Команды:

```bash
corepack pnpm db:up
corepack pnpm db:down
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:push
corepack pnpm db:studio
```

Доменные таблицы добавляй в `src/shared/db/schema.ts` или, когда схема вырастет, разнеси их по файлам внутри `src/shared/db/schema/` и обнови `drizzle.config.ts`.

## Формы

Для форм используется связка:

- `react-hook-form` - состояние и lifecycle формы;
- `zod` - схема данных и валидация;
- `@hookform/resolvers/zod` - адаптер схемы к форме.

Схемы, относящиеся к конкретному сценарию, держи внутри соответствующей `feature`. Общие схемы и утилиты можно выносить в `shared`.

## UI

Tailwind CSS v4 подключен через `@tailwindcss/vite` в `vite.config.ts` и `@import "tailwindcss";` в `src/styles.css`.

Base UI установлен как `@base-ui/react`. Используй его для доступных headless-примитивов и стилизуй через Tailwind. Не добавляй вторую UI-библиотеку без обновления этого документа и явного основания.

## Тестирование

- `corepack pnpm test` - Vitest.
- `corepack pnpm test:e2e` - Playwright.
- `corepack pnpm test:e2e:ui` - интерактивный Playwright UI.

Playwright запускает dev server через `webServer` из `playwright.config.ts`.
Vitest настроен через `vitest.config.ts` и ищет unit/integration specs внутри `src`.

## Storybook

- `corepack pnpm storybook` - локальный Storybook dev server на порту 6006.
- `corepack pnpm build-storybook` - статическая сборка Storybook.

Storybook настроен через `.storybook/main.ts`, `.storybook/preview.ts` и
отдельный `.storybook/vite.config.ts`, чтобы не подключать app-only плагины
TanStack Start в component workshop. Глобальные стили приложения подключаются из
`src/styles.css`, а Tailwind CSS v4 собирается через `@tailwindcss/vite`.
Stories размещай рядом с UI-компонентами и страницами как `*.stories.tsx`.

## Линтинг и форматирование

- `corepack pnpm lint` - ESLint.
- `corepack pnpm format` - Prettier write + ESLint fix.
- `corepack pnpm format:check` - проверка Prettier.
- `corepack pnpm typecheck` - TypeScript без emit.
- `corepack pnpm check` - общий локальный quality gate.
