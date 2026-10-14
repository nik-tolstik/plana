# Plana — дизайн-система (этап DS)

Основа — дизайн-система проекта finnn (D:\projects\finnn), перенесённая с ревью и рефакторингом: без Radix/Slot, без Biome, без sonner, пути под FSD Plana. Источник токенов — `apps/web/src/shared/styles/globals.css`, витрина — Storybook (`pnpm --filter web storybook`, http://localhost:6006).

## Стек

| Инструмент           | Пакет                                     | Роль                                                                    |
| -------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Стили                | `tailwindcss` v4 + `@tailwindcss/postcss` | утилити-классы, `@theme inline`-маппинг токенов, `@custom-variant dark` |
| Доп. анимации входа  | `tw-animate-css`                          | enter/exit-классы Storybook/диалогов                                    |
| Анимации             | `motion` ^12 (новое имя framer-motion)    | все приходы/уходы, spring-галочки, layout-индикаторы                    |
| Варианты компонентов | `cva` + `clsx` + `tailwind-merge`         | `cn()` в `@/shared/lib/cn` — единственная точка слияния классов         |
| Иконки               | `lucide-react`                            | эмодзи в UI запрещены                                                   |
| Шрифт                | `@fontsource-variable/onest`              | Onest Variable, woff2 33.76 kB                                          |
| Позиционирование     | `@floating-ui/react` 0.27                 | Dialog, Popover (flip/shift/size), виртуальные якоря контекстных меню   |
| Календарь            | `react-day-picker` v9 + `date-fns` v4     | Calendar (locale ru), на токенах plana; часть DateTimePicker            |
| Витрина              | `storybook` 10 (`@storybook/react-vite`)  | addon-docs + addon-a11y, тулбар темы light/dark                         |

## Токены: четыре слоя

Каждый слой ссылается только на предыдущие; в компонентах выше `shared/ui` используются только слои 3–4 (утилити-классы). Источник — `apps/web/src/shared/styles/globals.css`.

**1. Палитра** (`--palette-*`, `:root`): самодостаточный набор сырых значений (hex/oklch), в компонентах не используются; дефолтная палитра Tailwind не подключается.

| Токен                             | Значение                          |
| --------------------------------- | --------------------------------- |
| `neutral-50..900`                 | #fff … #17171a (7 ступеней)       |
| `blue-600` / `blue-400`           | `#2d69fd` / `#60a5fa`             |
| `orange-400`                      | `#fb923c`                         |
| `green-400` / `green-700`         | `#4ade80` / `#15803d`             |
| `red-400` / `red-500` / `red-600` | `#f87171` / `#ef4444` / `#dc2626` |
| `dark-700..900`                   | oklch(0.3 … 0.19 0 0)             |
| `dark-text-secondary`             | oklch(0.708 0 0)                  |

`#2d69fd`, а не finnn-шный `#2f6bff`: белый текст на `#2f6bff` давал 4.49:1 (WCAG AA требует 4.5:1); `#2d69fd` даёт 4.61:1 при незаметной глазу разнице (2/255 на канал).

**2. База темы** (`:root, html.light` / `html.dark`) — единственное место различий тем: слои поверхностей `--surface-canvas/raised/inset/subtle/control/control-hover/hover/selected`, текст `--text-primary/secondary/accent`, `--border-default`, `--focus-ring`, статусные `--danger`/`--positive` со своими foreground, три компонентных исключения (`--dialog-background`, `--segmented-indicator`, `--option-selected`) и домен `--priority-low/medium/high`.

| Токен              | light                    | dark                    | Контраст текста |
| ------------------ | ------------------------ | ----------------------- | --------------- |
| `--surface-canvas` | white                    | oklch(0.19 0 0)         | —               |
| `--text-primary`   | neutral-900              | white                   | 16.9 / 15.5     |
| `--text-secondary` | neutral-500              | dark-text-secondary     | 5.0 / 6.5       |
| `--text-accent`    | blue-600 (4.61 на white) | blue-400 (7.25 на dark) | —               |
| `--danger`         | red-600 (4.83 с белым)   | red-400                 | 4.83 / 5.75     |
| `--positive`       | green-700 (5.02 с белым) | green-400               | 5.02 / 9.1      |
| `--border-default` | neutral-200              | oklch(1 0 0 / 10%)      | —               |

Отдельный `--text-accent` существует потому, что один синий не проходит AA в обеих ролях сразу: заливке с белым текстом нужен тёмный синий (`--primary`), тексту на тёмном фоне — светлый.

**3. Контракты** (`:root`, от темы не зависят, объявлены один раз): Tailwind-API алиасы (`--background → surface-canvas`, `--foreground → text-primary`, `--primary-text → text-accent`, `--destructive → danger`, `--success → positive`, …) и компонентные (`--popover-background`, `--control-background(-hover)`, `--control-focus/placeholder`, `--segmented-background/hover`, `--option-hover`). Смена темы меняет только базу — контракты не дублируются.

**4. `@theme inline`**: маппинг контрактов в утилити-классы (`bg-surface-*`, `bg-control(-hover)`, `text-primary-text`, `bg-priority-*`, …), радиусы `--radius-sm..xl` (4/6/8/10 px), шрифты.

Сменные акценты: контракт `html[data-accent-color="blue|pink|green|orange|violet"]` → `--app-accent-color` готов, UI выбора — post-MVP.

Договорённости по слоям поверхностей:

- `bg-control` / `bg-control-hover` — интерактивные контролы: поля ввода и иконки-кнопки внутри строк.
- `bg-surface-hover` / `bg-surface-selected` — крупные зоны: строки списков и меню, выделение активной страницы.
- `bg-surface-subtle` — статичные подложки: чипы тегов, скелетон.

## Тема

- Классы `.light` / `.dark` на `<html>`; `system` резолвится в JS через `matchMedia(prefers-color-scheme: dark)` + подписка `watchSystemTheme()` (медиа-запросов в CSS нет — тема детерминирована классом).
- Хранение: `localStorage["plana.theme"]`, применение до первого рендера (без мигания).
- Storybook: тулбар «Тема дизайн-системы» (globals `theme:light|dark`).

## Анимации (motion)

Везде `useReducedMotion()`: при prefers-reduced-motion паттерны отключаются (duration 0 / initial false).

| Паттерн              | Параметры                                                                  | Где                                 |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| Появление элемента   | fade + rise: opacity 0→1, y 8→0, 250 ms easeOut                            | AnimatedListItem, PageFade, панели  |
| Stagger списка       | шаг 40 ms, максимум 8 шагов (320 ms) — `staggerDelayMs(i)`                 | группы задач, карточки привычек     |
| Схлопывание блока    | height auto→0 + opacity, 180–220 ms easeOut                                | папки, группы задач, форма привычки |
| Spring-галочка       | scale 0.3→1, spring stiffness 700 / damping 30; whileTap ×0.85             | Checkbox                            |
| Переезд сегмента     | spring stiffness 500 / damping 40 по getBoundingClientRect                 | Segmented                           |
| Переезд строки (DnD) | `layout` на вложенном motion.div, 220 ms easeOut                           | перестановка задач, строки сайдбара |
| Завершение задачи    | check spring мгновенно → PATCH через 450 ms → height 0 + opacity, 220 ms   | TaskRow (completing-фаза)           |
| Панель деталей       | slide-in x:16; уход — closing-фаза (animate → 0) + таймер-страховка 350 ms | TaskDetails                         |
| Диалог               | open 180 ms / close 120 ms, scale 0.96, transformOrigin bottom на mobile   | Dialog (floating-ui)                |
| Поповер              | open 180 ms / close 120 ms + scale 0.98, CSS через useTransitionStyles     | Popover, Select, ContextMenu        |

Поповеры анимируются CSS-переходами `useTransitionStyles` (transform-origin от стороны размещения), а не motion: контент живёт в `FloatingPortal` и монтируется/размонтируется floating-ui, `AnimatePresence` туда не тянётся.

Правила: уходы вложенных списков — через `AnimatePresence` (exit-анимации); панель деталей — исключение: сама играет closing-фазу (`animate → {opacity:0, x:16}` + `onAnimationComplete`) с таймером-страховкой и мгновенным закрытием при `!document.hasFocus()` — в webview без фокуса rAF замирает и exit `AnimatePresence` не завершается никогда. Для HTML5 drag&drop — обычный `<li>` с пропсами + вложенный `motion.div` (motion.li перехватывает onDragStart как свой жест).

## Доступность (WCAG AA)

- Контраст текста ≥ 4.5:1 — обеспечен токенами (таблица выше); проверено addon-a11y по всем стори в обеих темах (0 нарушений).
- Hover заливок не осветляет фон: `hover:brightness-95` вместо `bg-*/90` (осветление роняло контраст ниже 4.5).
- Checkbox: `role="checkbox"` + `aria-checked` (motion.button); Segmented: `role="radiogroup"` + sr-only radio.
- Оверлеи: Select — `role="listbox"`/`option` + `aria-selected`; поле времени — `role="combobox"` + `aria-activedescendant` + навигация стрелками/Enter/Escape; контекстное меню — `role="menu"`/`menuitem`. Фокус в поповерах не trap-ится (modal=false, initialFocus=-1) — фокус остаётся на триггере.
- Focus-visible ring `--control-focus/30` на всех интерактивных примитивах.
- Известный компромисс: priority-флаги в светлой теме (blue-400 2.54:1, orange-400 2.26:1) не дотягивают до 3:1 для графики (WCAG 1.4.11) — оставлено ради узнаваемого вида finnn, пересмотр post-MVP.

## Правила использования

- Классы пишем через `cn()`; варианты кнопок — через CVA (`Button variant/size`).
- В компонентах выше `shared/ui` — только семантические/компонентные токены (`bg-surface-*`, `text-muted-foreground`), не палитра. Исключение — danger-кнопка (red-50…red-950), задокументировано в Button.tsx.
- Border (`border-border`) — редкий акцент, не фон разделения: остаются только несущие конструкцию границы (сайдбар, карточки-контейнеры, инпуты). Отделять элементы внутри одной поверхности — фоном (`bg-surface-*`), отступами или разделителями списков, не рамкой. Карточка пользователя в сайдбаре — без рамки: hover-фон отделяет её от фона.
- Эмодзи в UI заменены на lucide-иконки (ArchiveIcon, FlameIcon, FlagIcon, XIcon, …).
- Мобильная адаптация: брейкпоинт 719px (`max-md:` / `MOBILE_MEDIA` из `@/shared/lib/use-is-mobile`).
- Типографика: Onest Variable, шкала text-xs(12) … text-2xl(24); цифры-счётчики — `tabular-nums`.

## Вторая волна порта из finnn (Popover-семейство)

Из finnn перенесены с ревью и упрощением под нужды Plana: `Popover` (база), `Select` (заменил нативный select), `Calendar` + `DateTimePicker` + `TimeAutocomplete` (заменили input type=date/time), `ContextMenu` (новый, в finnn его не было — собран из Popover с виртуальным якорем).

| Компонент        | Ключевые решения                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Popover          | Общий фундамент: useClick/useDismiss/useRole + flip/shift/size; `interaction: "click" \| "manual"` и внешний `reference` — для контекстного меню; middleware size ставит CSS-переменную `--popover-trigger-width` (дропдаун Select не шире триггера). Упрощено против finnn: без FloatingTree/overlay-portal-root                                                                                                                                                                   |
| Select           | API `options: {value, label}[]` вместо children-option; триггер Button field h-9 + ChevronDown (поворот на 180° при открытии); выбранный пункт — bg-option-selected + галочка text-primary-text; клик по пункту закрывает                                                                                                                                                                                                                                                           |
| Calendar         | react-day-picker v9, captionLayout="dropdown" (месяц+год селектами), locale ru из date-fns; DayButton — ghost Button, выбранный день bg-primary, today/range — bg-option-selected                                                                                                                                                                                                                                                                                                   |
| DateTimePicker   | Кнопка даты (variant field, формат dd.MM.yyyy) + TimeAutocomplete рядом. Над календарём — пресеты одной строкой (Сегодня/Завтра/Неделя/Без даты, flex-1, активный подсвечен `bg-primary/10 text-primary-text`; «Без даты» только при clearable). `inline`-режим — те же календарь и пресеты без триггера, для встраивания в чужой поповер (чип даты, quick-add). Время применяется только при существующей дате, дефолт при выборе дня — 09:00; clearable → крестик «Очистить дату» |
| TimeAutocomplete | Input role="combobox" поверх Popover-listbox: сетка 00:00–23:45 шаг 15 мин (96 опций), произвольное время валидируется `normalizeTimeInput` («9:05»→«09:05», «24:00»/«12:60» отклоняются)                                                                                                                                                                                                                                                                                           |
| ContextMenu      | ПКМ по обёрнутому children (render-prop отдаёт onContextMenu); меню позиционируется в точке клика через виртуальный якорь `DOMRect(x, y, 0, 0)`; пункты role="menuitem", у delete — danger (text-destructive)                                                                                                                                                                                                                                                                       |

Удаление задач: кнопки ✕ в строке и «В корзину» в панели деталей убраны — в список и восстановление из корзины теперь через ПКМ («Завершить»/«Удалить», в корзине «Восстановить»).

## Витрина Storybook

- Стори: `apps/web/src/shared/ui/stories/` — «Дизайн-токены/Обзор» (поверхности, действия, текст, радиусы, приоритеты) и «Примитивы/Обзор» (Кнопки, ПоляВвода, ЧекбоксыИБейджи, Сегменты, КарточкаИСкелетон, Диалог, ДатаИВремя, КонтекстноеМеню, АнимированныйСписок).
- Команды: `pnpm --filter web storybook` (dev :6006), `pnpm --filter web build:storybook`.
- A11y-панель: после изменения цветовых токенов перегонять стори в обеих темах.

## Размер бандла

Дизайн-система выросла вместе с бандлом: 499.07 kB → 683.31 kB (Tailwind + motion + lucide + шрифт, woff2 33.76 kB) → 824.76 kB (главный чанк в gzip 249.3 kB) после второй волны порта — react-day-picker + date-fns (locale ru). Ожидаемая цена этапа; оптимизация (code-split календаря по требованию, tree-shake иконок) — при необходимости перед деплоем.

## Третья волна: визуальный язык сущностей (EntityVisuals + MultiSelect)

К задачам ревью добавлены два примитива в `shared/ui` и паттерны редактирования поверх них.

| Примитив / паттерн | Ключевые решения                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EntityVisuals      | `EntityMarker` — единый маркер сущности: иконка lucide, окрашенная `ENTITY_COLORS[color]`, либо `ColorDot` (кружок size-1.5) при `icon: null`. Неизвестный ключ иконки не роняет рендер — fallback ListIcon. `ENTITY_COLORS` — 9 hex, синхронизированы с `LIST_COLORS` из @plana/shared                                                                                                                                                                                                                                |
| EntityStylePopover | Поповер настроек сущности (карандаш): Input имени (коммит по blur/Enter, пустое — откат), сетка 9 цветов (role=radiogroup, выбранный — outline ring), сетка иконок grid-cols-7 с пунктом «Без иконки» (точка цвета), кнопка «Готово». Контент ремаунтится при открытии — state имени не рассинхронизируется                                                                                                                                                                                                            |
| MultiSelect        | Триггер-кнопка с чипами (leading-маркер + имя) + chevron; дропдаун Popover w-64: поиск (показывается при >8 опций или заданном onCreate), role=listbox aria-multiselectable, опции — leading-маркер + имя + CheckIcon справа у выбранных (без чекбоксов: галочка уже справа), пункт «Создать «X»» при непустом фильтре без точного совпадения (lower). Владелец данных должен дополнять options элементами локального состояния, которых нет в кэше запроса, — иначе созданная сущность не появится в чипах до рефетча |
| Панель деталей     | `fixed` поверх контента (не flex-слот), автосейв diff→PATCH 600мс + flush на unmount, без «Сохранить»/алертов; ошибки — только isError мутации                                                                                                                                                                                                                                                                                                                                                                         |
| Инлайн-ввод задач  | Клик по тексту → textarea на месте; Enter — следующая задача, Shift+Enter — подзадача, Escape — отмена, blur — сохранить + открыть панель. Создание с `afterTaskId` держит строку ввода под только что созданной задачей                                                                                                                                                                                                                                                                                               |
