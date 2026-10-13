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

## Токены: три уровня

**1. Палитра** (`--palette-*`, в `:root`): сырые значения, в компонентах не используются.

| Токен                 | Значение                    |
| --------------------- | --------------------------- |
| `neutral-25..900`     | #fff … #17171a (9 ступеней) |
| `blue-600`            | `#2d69fd`                   |
| `dark-700..900`       | oklch(0.3 … 0.19 0 0)       |
| `dark-text-secondary` | oklch(0.708 0 0)            |

`#2d69fd`, а не finnn-шный `#2f6bff`: белый текст на `#2f6bff` давал 4.49:1 (WCAG AA требует 4.5:1); `#2d69fd` даёт 4.61:1 при незаметной глазу разнице (2/255 на канал).

**2. Семантические** (переопределяются темой, `:root, html.light` / `html.dark`):

| Токен                | light                    | dark                    | Контраст текста |
| -------------------- | ------------------------ | ----------------------- | --------------- |
| `--background`       | white                    | oklch(0.19 0 0)         | —               |
| `--foreground`       | neutral-900              | white                   | 16.9 / 15.5     |
| `--muted-foreground` | neutral-500              | dark-text-secondary     | 5.0 / 6.5       |
| `--primary`          | `#2d69fd`                | `#2d69fd`               | 4.61 с белым    |
| `--primary-text`     | blue-600 (4.61 на white) | blue-400 (7.25 на dark) | —               |
| `--success`          | green-700 (5.02 с белым) | green-400               | 5.02 / 9.1      |
| `--destructive`      | red-600 (4.83 с белым)   | red-400                 | 4.83 / 5.75     |
| `--surface-raised`   | white                    | oklch(0.23 0 0)         | —               |
| `--surface-control`  | neutral-125              | oklch(0.269 0 0)        | —               |
| `--border`           | neutral-200              | oklch(1 0 0 / 0.1)      | —               |

Отдельные токены для «акцент как текст» (`--primary-text`) и «акцент как заливка» (`--primary`) существуют потому, что один синий не проходит AA в обеих ролях сразу: заливке с белым текстом нужен тёмный синий, тексту на тёмном фоне — светлый.

**3. Компонентные**: `--control-background`, `--control-hover`, `--control-focus`, `--segmented-*`, `--dialog-background`, `--popover-background`, `--option-*`.

**Домен-токены** (смысл Plana): `--priority-low/medium/high` (light: blue-400/orange-400/red-400, dark — те же).

Сменные акценты: контракт `html[data-accent-color="blue|pink|green|orange|violet"]` → `--app-accent-color` готов, UI выбора — post-MVP.

## Тема

- Классы `.light` / `.dark` на `<html>`; `system` резолвится в JS через `matchMedia(prefers-color-scheme: dark)` + подписка `watchSystemTheme()` (медиа-запросов в CSS нет — тема детерминирована классом).
- Хранение: `localStorage["plana.theme"]`, применение до первого рендера (без мигания).
- Storybook: тулбар «Тема дизайн-системы» (globals `theme:light|dark`).

## Анимации (motion)

Везде `useReducedMotion()`: при prefers-reduced-motion паттерны отключаются (duration 0 / initial false).

| Паттерн            | Параметры                                                                | Где                                 |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------- |
| Появление элемента | fade + rise: opacity 0→1, y 8→0, 250 ms easeOut                          | AnimatedListItem, PageFade, панели  |
| Stagger списка     | шаг 40 ms, максимум 8 шагов (320 ms) — `staggerDelayMs(i)`               | группы задач, карточки привычек     |
| Схлопывание блока  | height auto→0 + opacity, 180–200 ms easeOut                              | папки, группы задач, форма привычки |
| Spring-галочка     | scale 0.3→1, spring stiffness 700 / damping 30; whileTap ×0.85           | Checkbox                            |
| Переезд сегмента   | spring stiffness 500 / damping 40 по getBoundingClientRect               | Segmented                           |
| Панель деталей     | slide-in x:16, вход и уход                                               | TaskDetails                         |
| Диалог             | open 180 ms / close 120 ms, scale 0.96, transformOrigin bottom на mobile | Dialog (floating-ui)                |
| Поповер            | open 180 ms / close 120 ms + scale 0.98, CSS через useTransitionStyles   | Popover, Select, ContextMenu        |

Поповеры анимируются CSS-переходами `useTransitionStyles` (transform-origin от стороны размещения), а не motion: контент живёт в `FloatingPortal` и монтируется/размонтируется floating-ui, `AnimatePresence` туда не тянется.

Правила: `AnimatePresence` обязателен для любых уходов (иначе exit-анимации не работают); для HTML5 drag&drop — обычный `<li>` с пропсами + вложенный `motion.div` (motion.li перехватывает onDragStart как свой жест).

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
- Эмодзи в UI заменены на lucide-иконки (ArchiveIcon, FlameIcon, FlagIcon, XIcon, …).
- Мобильная адаптация: брейкпоинт 719px (`max-md:` / `MOBILE_MEDIA` из `@/shared/lib/use-is-mobile`).
- Типографика: Onest Variable, шкала text-xs(12) … text-2xl(24); цифры-счётчики — `tabular-nums`.

## Вторая волна порта из finnn (Popover-семейство)

Из finnn перенесены с ревью и упрощением под нужды Plana: `Popover` (база), `Select` (заменил нативный select), `Calendar` + `DateTimePicker` + `TimeAutocomplete` (заменили input type=date/time), `ContextMenu` (новый, в finnn его не было — собран из Popover с виртуальным якорем).

| Компонент        | Ключевые решения                                                                                                                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Popover          | Общий фундамент: useClick/useDismiss/useRole + flip/shift/size; `interaction: "click" \| "manual"` и внешний `reference` — для контекстного меню; middleware size ставит CSS-переменную `--popover-trigger-width` (дропдаун Select не шире триггера). Упрощено против finnn: без FloatingTree/overlay-portal-root |
| Select           | API `options: {value, label}[]` вместо children-option; триггер Button field h-9 + ChevronDown (поворот на 180° при открытии); выбранный пункт — bg-option-selected + галочка text-primary-text; клик по пункту закрывает                                                                                         |
| Calendar         | react-day-picker v9, captionLayout="dropdown" (месяц+год селектами), locale ru из date-fns; DayButton — ghost Button, выбранный день bg-primary, today/range — bg-option-selected                                                                                                                                 |
| DateTimePicker   | Кнопка даты (variant field, формат dd.MM.yyyy) + TimeAutocomplete рядом; без relativeDatePresets/Segmented из finnn; время применяется только при существующей дате, дефолт при выборе дня — 09:00; clearable → крестик «Очистить дату»                                                                           |
| TimeAutocomplete | Input role="combobox" поверх Popover-listbox: сетка 00:00–23:45 шаг 15 мин (96 опций), произвольное время валидируется `normalizeTimeInput` («9:05»→«09:05», «24:00»/«12:60» отклоняются)                                                                                                                         |
| ContextMenu      | ПКМ по обёрнутому children (render-prop отдаёт onContextMenu); меню позиционируется в точке клика через виртуальный якорь `DOMRect(x, y, 0, 0)`; пункты role="menuitem", у delete — danger (text-destructive)                                                                                                     |

Удаление задач: кнопки ✕ в строке и «В корзину» в панели деталей убраны — в список и восстановление из корзины теперь через ПКМ («Завершить»/«Удалить», в корзине «Восстановить»).

## Витрина Storybook

- Стори: `apps/web/src/shared/ui/stories/` — «Дизайн-токены/Обзор» (поверхности, действия, текст, радиусы, приоритеты) и «Примитивы/Обзор» (Кнопки, ПоляВвода, ЧекбоксыИБейджи, Сегменты, КарточкаИСкелетон, Диалог, ДатаИВремя, КонтекстноеМеню, АнимированныйСписок).
- Команды: `pnpm --filter web storybook` (dev :6006), `pnpm --filter web build:storybook`.
- A11y-панель: после изменения цветовых токенов перегонять стори в обеих темах.

## Размер бандла

Дизайн-система выросла вместе с бандлом: 499.07 kB → 683.31 kB (Tailwind + motion + lucide + шрифт, woff2 33.76 kB) → 824.76 kB (главный чанк в gzip 249.3 kB) после второй волны порта — react-day-picker + date-fns (locale ru). Ожидаемая цена этапа; оптимизация (code-split календаря по требованию, tree-shake иконок) — при необходимости перед деплоем.

## Третья волна: визуальный язык сущностей (EntityVisuals + MultiSelect)

К задачам ревью добавлены два примитива в `shared/ui` и паттерны редактирования поверх них.

| Примитив / паттерн | Ключевые решения                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EntityVisuals      | `EntityMarker` — единый маркер сущности: иконка lucide, окрашенная `ENTITY_COLORS[color]`, либо `ColorDot` (кружок size-1.5) при `icon: null`. Неизвестный ключ иконки не роняет рендер — fallback ListIcon. `ENTITY_COLORS` — 9 hex, синхронизированы с `LIST_COLORS` из @plana/shared                                                                                                                                                                              |
| EntityStylePopover | Поповер настроек сущности (карандаш): Input имени (коммит по blur/Enter, пустое — откат), сетка 9 цветов (role=radiogroup, выбранный — outline ring), сетка иконок grid-cols-7 с пунктом «Без иконки» (точка цвета), кнопка «Готово». Контент ремаунтится при открытии — state имени не рассинхронизируется                                                                                                                                                          |
| MultiSelect        | Триггер-кнопка с чипами (leading-маркер + имя) + chevron; дропдаун Popover w-64: поиск (показывается при >8 опций или заданном onCreate), role=listbox aria-multiselectable, опции с Checkbox size sm + галочкой CheckIcon, пункт «Создать «X»» при непустом фильтре без точного совпадения (lower). Владелец данных должен дополнять options элементами локального состояния, которых нет в кэше запроса, — иначе созданная сущность не появится в чипах до рефетча |
| Панель деталей     | `fixed` поверх контента (не flex-слот), автосейв diff→PATCH 600мс + flush на unmount, без «Сохранить»/алертов; ошибки — только isError мутации                                                                                                                                                                                                                                                                                                                       |
| Инлайн-ввод задач  | Клик по тексту → textarea на месте; Enter — следующая задача, Shift+Enter — подзадача, Escape — отмена, blur — сохранить + открыть панель. Создание с `afterTaskId` держит строку ввода под только что созданной задачей                                                                                                                                                                                                                                             |
