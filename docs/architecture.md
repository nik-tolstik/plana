# Архитектура проекта

## Назначение

`plana` - React-приложение на TanStack Start. Проект использует file-based routing TanStack Router, Tailwind CSS v4 для стилей, shadcn/ui на Base UI для локальных UI-примитивов, TanStack Query для серверного состояния, i18next/react-i18next для локализации и FSD как файловую архитектуру.

Этот документ является рабочим архитектурным контрактом для будущих агентов. Если фактическая архитектура меняется, документ нужно обновлять в той же задаче.

## Текущий стек

- Runtime и сборка: Vite + TanStack Start.
- UI: React 19, Tailwind CSS v4, shadcn/ui preset `base-maia` на Base UI (`@base-ui/react`), `lucide-react`.
- Typography: Onest через `@fontsource-variable/onest`.
- Роутинг: TanStack Router с генерацией `src/routeTree.gen.ts`.
- Server state: TanStack Query.
- Internationalization: i18next + react-i18next, supported locales `en` and `ru`.
- Theme: first-party light/dark/system theme through CSS variables and an `html.dark` class.
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
- `src/shared/i18n` - общая i18n-инфраструктура: поддерживаемые локали, ресурсы переводов, locale detection helpers и переиспользуемый UI переключения языка.
- `src/shared/theme` - общая theme-инфраструктура: поддерживаемые темы, cookie helpers, theme detection и React provider/hook.

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
      theme-provider.tsx
      query-provider.tsx
      index.ts
  features/
    theme-switcher/
      ui/
        theme-switcher.tsx
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
    lib/
      utils.ts
    i18n/
      ui/
        language-switcher.tsx
      i18n.ts
      locale.ts
      resources.ts
    theme/
      theme-provider.tsx
      theme.ts
    ui/
      button/
        Button.tsx
        index.ts
      segmented/
        Segmented.tsx
        index.ts
  routeTree.gen.ts
  router.tsx
  styles.css
```

## Роутинг

TanStack Router использует route-файлы в `src/routes`. Роут `/` объявлен в `src/routes/index.tsx` и рендерит `HomePage` из `src/pages/home`.

`src/routes/__root.tsx` задает HTML shell, global head, scripts и глобальные devtools. На этом же уровне определяется начальная локаль и тема, а также подключаются `I18nProvider`, `ThemeProvider` и `QueryProvider`, чтобы i18n, тема и TanStack Query были доступны всем страницам.

После добавления или изменения route-файлов запускай:

```bash
corepack pnpm generate-routes
```

## i18n

Локализация построена на `i18next` и `react-i18next`. Сейчас поддерживаются только `en` и `ru`.

Ключевые файлы:

- `src/shared/i18n/locale.ts` - тип `Locale`, список поддерживаемых локалей, cookie helpers и определение локали.
- `src/shared/i18n/resources.ts` - ресурсы переводов для английского и русского.
- `src/shared/i18n/i18n.ts` - фабрика i18next instance.
- `src/app/providers/i18n-provider.tsx` - React provider для приложения и Storybook.
- `src/shared/i18n/ui/language-switcher.tsx` - shared UI переключения языка.

Локаль не хранится в URL. Порядок выбора языка: cookie `plana-locale`, затем `Accept-Language`/browser language, затем fallback `en`. Новые пользовательские runtime-тексты добавляй в ресурсы переводов сразу для `en` и `ru`; не хардкодь копирайт в route/page/widget/feature компонентах. Storybook-only demo labels могут оставаться английскими, если они не являются runtime-текстами приложения.

## Theme

Тема приложения построена на CSS-переменных из `src/styles.css` и классе `dark` на `<html>`. Сейчас поддерживаются пользовательские режимы `light`, `dark` и `system`; режим `system` вычисляется в фактическую тему `light` или `dark` через `prefers-color-scheme`.

Ключевые файлы:

- `src/shared/theme/theme.ts` - тип `Theme`, список поддерживаемых тем, cookie helpers и определение темы.
- `src/shared/theme/theme-provider.tsx` - React provider и `useTheme` hook, которые применяют resolved-тему к `document.documentElement` и следят за изменениями `prefers-color-scheme`.
- `src/features/theme-switcher` - пользовательский переключатель темы на `Segmented`.

Выбранный режим сохраняется в cookie `plana-theme`, чтобы TanStack Start мог выставить правильный `<html class="dark">` уже на серверном рендере для явной темной темы. Для режима `system` сервер использует fallback resolved-тему, а клиент после hydration применяет текущую системную настройку. Пользовательские компоненты должны использовать semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`) вместо жестко заданных dark/light palette classes, если элемент должен реагировать на тему.

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

shadcn/ui настроен через `components.json` с preset `base-maia`, Base UI primitives и aliases:

- `@/shared/ui` - локальные UI-компоненты shadcn.
- `@/shared/lib/utils` - общий `cn` helper.

Каждый UI-компонент shadcn размещай в отдельной lowercase-папке внутри `src/shared/ui`, а файл компонента называй в PascalCase:

```text
src/shared/ui/button/Button.tsx
src/shared/ui/button/index.ts
```

Для добавления компонентов используй shadcn CLI через Corepack/pnpm, затем приводи сгенерированные файлы к этой структуре:

```bash
corepack pnpm dlx shadcn@latest add <component>
```

Глобальный шрифт - Onest. Он импортируется в `src/styles.css` через `@fontsource-variable/onest` и подключается к `--font-sans`.

Base UI установлен как `@base-ui/react`. Используй его напрямую только когда shadcn-компонента недостаточно; общие UI-примитивы держи в `src/shared/ui` и стилизуй через Tailwind. Не добавляй вторую UI-библиотеку без обновления этого документа и явного основания.

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
