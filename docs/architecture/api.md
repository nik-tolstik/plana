# Plana — структура API

REST поверх NestJS, префикс `/v1`. Схема БД: `docs/architecture/erd.md`. Контракты запросов/ответов (zod-схемы) живут в `packages/shared` и переиспользуются фронтом. OpenAPI/Swagger (`/docs` в develop) — запланировано, пока не подключено.

## Конвенции

- JSON, поля в **camelCase**. Даты-моменты — ISO 8601 UTC (`2026-10-09T12:00:00Z`), календарные дни — `2026-10-09`, время дня — `17:00`.
- Идемпотентность: `GET` чистые; мутации обычные. Особых требований к ретраям в MVP нет.
- Пагинация: `?limit=50&offset=0` (MVP достаточно; курсорная — post-MVP). Максимальный `limit` = 200.
- Тело ошибок единообразное:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "человекочитаемое описание",
    "details": [{ "path": "dueDate", "message": "некорректная дата" }]
  }
}
```

Коды: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409, напр. email занят), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `INTERNAL` (500).

- Авторизация: `Authorization: Bearer <accessToken>`. Access-токен — JWT, 15 минут. Refresh — opaque-токен, 30 дней, ротация при каждом использовании, хранится хэшем (см. ERD). Компромисс MVP: refresh в localStorage на клиенте (междоменные httpOnly-cookie между `*.vercel.app` и `*.up.railway.app` ненадёжны, особенно в PWA на iOS); при XSS-угрозе смягчается ротацией и отзывом всех сессий. Улучшение post-MVP — переход на BFF или first-party домен.
- Rate limiting: NestJS Throttler — 100 req/мин на пользователя, 20 req/мин на auth-эндпоинты (запланировано, не подключено).

## Auth

| Метод и путь                   | Назначение                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `POST /v1/auth/register`       | `{ email, password, name }` → `{ accessToken, refreshToken, user }`. Создаёт Inbox-список. |
| `POST /v1/auth/login`          | `{ email, password }` → токены + user                                                      |
| `POST /v1/auth/refresh`        | `{ refreshToken }` → новые токены (старый отзывается)                                      |
| `POST /v1/auth/logout`         | `{ refreshToken }` — отзывает одну сессию                                                  |
| `POST /v1/auth/logout-all`     | отзывает все сессии пользователя                                                           |
| `GET /v1/auth/google`          | 302 на Google OAuth (планируется, M8)                                                      |
| `GET /v1/auth/google/callback` | обмен кода; если Google-email найден — вход, иначе — регистрация+связка (планируется, M8)  |

`POST /v1/auth/oauth/exchange`: `{ authCode }` → токены + user (authCode одноразовый, 60 сек) — планируется вместе с Google OAuth (M8).

`GET /v1/auth/me` — дублируется как `GET /v1/me` (см. профиль) — используем `/v1/me`.

## Профиль

| Метод и путь    | Назначение                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| `GET /v1/me`    | текущий пользователь                                                       |
| `PATCH /v1/me`  | `{ name?, timezone?, theme? }`                                             |
| `DELETE /v1/me` | удаление аккаунта (каскад, подтверждение паролем на клиенте) — планируется |

## Структура (folders, lists, sections)

| Метод и путь                  | Назначение                                                |
| ----------------------------- | --------------------------------------------------------- |
| `GET /v1/folders`             | все папки с их списками (дерево сайдбара одним запросом)  |
| `POST /v1/folders`            | `{ name }`                                                |
| `PATCH /v1/folders/:id`       | `{ name?, position? }`                                    |
| `DELETE /v1/folders/:id`      | папка удаляется, списки выходят из неё (folder_id → null) |
| `POST /v1/lists`              | `{ name, color?, emoji?, folderId? }`                     |
| `PATCH /v1/lists/:id`         | `{ name?, color?, emoji?, folderId?, position? }`         |
| `DELETE /v1/lists/:id`        | список и его задачи → корзина                             |
| `POST /v1/lists/:id/restore`  | из корзины                                                |
| `POST /v1/lists/:id/sections` | `{ name }`                                                |
| `GET /v1/lists/:id/sections`  | секции списка по `position` (для панели деталей, M3)      |
| `PATCH /v1/sections/:id`      | `{ name?, position? }`                                    |
| `DELETE /v1/sections/:id`     | секция удаляется, задачи остаются в списке без секции     |

`GET /v1/folders` возвращает: папки, их списки и списки без папки + Inbox — всё для левого сайдбара за один запрос.

## Задачи

| Метод и путь                    | Назначение                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/tasks`                 | фильтры: `listId`, `smart` (`inbox` \| `today` \| `tomorrow` \| `next7` \| `all` \| `completed` \| `trash`), `q` (поиск ILIKE по title/description, спецсимволы `% _ \` экранируются), `tagId`, `limit/offset`. Реализовано в M5; `sectionId`, `priority`, `completed` (bool) — будущие этапы. Возвращает задачи с подзадачами и тегами. |
| `POST /v1/tasks`                | `{ title, description?, priority?, dueDate?, dueTime?, rrule?, listId? (default Inbox), sectionId?, tagNames?, pinned?, afterTaskId? }` — `afterTaskId` вставляет задачу сразу после указанной в том же контейнере (инлайн-ввод)                                                                                                         |
| `GET /v1/tasks/:id`             | одна задача со всеми подзадачами и тегами (вложения и напоминания — будущие этапы)                                                                                                                                                                                                                                                       |
| `PATCH /v1/tasks/:id`           | любые поля; `tagNames` — полная замена тегов по именам (несуществующие создаются неявно, дубликаты по lower(name) в одном запросе → 400); `reminders` — массив `{ offsetMinutes }` (полная замена, будущий этап)                                                                                                                         |
| `DELETE /v1/tasks/:id`          | в корзину (`?purge=true` — сразу физически, доступно и из корзины). Корзина хранит 30 дней: при запросе `smart=trash` задачи старше 30 дней физически удаляются (lazy purge)                                                                                                                                                             |
| `POST /v1/tasks/:id/restore`    | из корзины                                                                                                                                                                                                                                                                                                                               |
| `POST /v1/tasks/:id/complete`   | завершить (для повторяющейся — сдвиг вхождения, см. ERD)                                                                                                                                                                                                                                                                                 |
| `POST /v1/tasks/:id/uncomplete` | вернуть в работу (у повторяющейся — удаляется последняя запись task_completions, due_date откатывается к ней)                                                                                                                                                                                                                            |
| `POST /v1/tasks/batch`          | `{ taskIds (1..100), action: 'complete' \| 'trash' \| 'restore' \| 'move', listId? (обязателен для move), sectionId? }` → `{ updated }`. Чужие и несуществующие id пропускаются молча; для `move` задачи ставятся в конец целевого контейнера                                                                                            |
| `POST /v1/tasks/parse`          | `{ text }` → `{ title, dueDate?, dueTime?, rrule?, priority, tags: string[] }` — NLP-парсер для quick-add, ничего не создаёт. Хештеги `#тег` вырезаются из заголовка и попадают в `tags` (M5)                                                                                                                                            |

### Подзадачи и теги

| Метод и путь                      | Назначение                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `POST /v1/tasks/:taskId/subtasks` | `{ title }`                                                                                |
| `PATCH /v1/subtasks/:id`          | `{ title?, done?, position? }`                                                             |
| `DELETE /v1/subtasks/:id`         |                                                                                            |
| `POST /v1/tasks/:id/nest`         | `{ parentTaskId }` — задача становится подзадачей (тот же список; мета-поля отбрасываются) |
| `POST /v1/subtasks/:id/promote`   | подзадача становится отдельной задачей сразу после родительской                            |
| `GET /v1/tags`                    | все теги пользователя                                                                      |
| `POST /v1/tags`                   | `{ name, color?, icon? }`                                                                  |
| `PATCH /v1/tags/:id`              | `{ name?, color?, icon?, position? }`                                                      |
| `DELETE /v1/tags/:id`             | отвязывается от всех задач                                                                 |

Теги на задаче ставятся через `POST/PATCH /v1/tasks` полем `tagNames: string[]` (имена, не id; до 20, дубликаты по lower(name) в одном запросе → 400): несуществующие теги создаются неявно, уникальность имён в рамках пользователя по lower(name). Отклонение от исходного плана (`tagIds`) — осознанное: клиенту не нужно знать id, а неявное создание покрывает quick-add с хештегами одним запросом (см. decisions.md, часть 8).

### Повторы (RRULE, M4)

Поддерживаемое подмножество RFC 5545 (без DTSTART — он в `rruleStartDate`, при создании = `dueDate`): `FREQ=DAILY|WEEKLY|MONTHLY|YEARLY`, `INTERVAL=1..52`, `BYDAY` (только WEEKLY, коды MO…SU), `COUNT=1..999` (включая первое вхождение), `UNTIL=YYYY-MM-DD` (включительно). `COUNT` и `UNTIL` взаимоисключающие. Движок — `packages/shared/src/lib/rrule.ts`, работает на календарных днях (см. decisions.md, часть 7).

Семантика: `dueDate/dueTime` всегда следующее вхождение. Завершение повторяющейся задачи — запись в `task_completions` + сдвиг `dueDate` на первое вхождение после `max(dueDate, сегодня)` (просроченные вхождения пропускаются); правило исчерпано (COUNT/UNTIL) — задача закрывается через `completedAt`. Отмена (`uncomplete`) удаляет последнюю запись истории и возвращает `dueDate` к закрытому вхождению. Смена `rrule` или `dueDate` перезапускает шаблон (`rruleStartDate` = новая дата) и очищает историю. `rrule` без `dueDate` → 400 (create-схема и merge-проверка в PATCH).

## Вложения (планируется)

| Метод и путь                         | Назначение                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/tasks/:taskId/attachments` | `{ fileName, mimeType, sizeBytes }` → `{ id, uploadUrl }` — presigned PUT в Object Storage. Проверяет лимиты 10 МБ/файл, 100 МБ/пользователь и допустимые mime (изображения, pdf, тексты, архивы). |
| `POST /v1/attachments/:id/confirm`   | загрузка завершена → фиксирует `uploaded_at`                                                                                                                                                       |
| `GET /v1/attachments/:id/url`        | presigned GET (срок 1 час)                                                                                                                                                                         |
| `DELETE /v1/attachments/:id`         | метаданные + объект в бакете                                                                                                                                                                       |

## Web Push (планируется)

| Метод и путь                | Назначение                                                                     |
| --------------------------- | ------------------------------------------------------------------------------ |
| `POST /v1/push/subscribe`   | `{ endpoint, keys: { p256dh, auth } }` (стандартный PushSubscription.toJSON()) |
| `DELETE /v1/push/subscribe` | `{ endpoint }`                                                                 |
| `POST /v1/push/test`        | тестовый push во все устройства пользователя                                   |

## Привычки

| Метод и путь                          | Назначение                                                               |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `GET /v1/habits`                      | все привычки + вхождения за последние 60 дней (для стриков и календаря)  |
| `POST /v1/habits`                     | `{ name, type: 'check' \| 'number', targetValue?, daysOfWeek?, color? }` |
| `PATCH /v1/habits/:id`                | любые поля; `archived: true` — в архив                                   |
| `DELETE /v1/habits/:id`               | физическое удаление с вхождениями (из архива)                            |
| `PUT /v1/habits/:id/entries/:date`    | `{ value }` (check: 0 или 1; number: 0..targetValue*2) — идемпотентно    |
| `DELETE /v1/habits/:id/entries/:date` | убрать чек-ин за день                                                    |

`targetValue` (1..1000) обязателен для `type: 'number'` и запрещён для `'check'` (create-схема и merge-проверка в PATCH, как пара rrule/dueDate из M4). `daysOfWeek` — битовая маска 1..127 (бит 0 = понедельник, 127 = все дни, дефолт). Отметка за будущий день или по архивной привычке → 400; активную привычку удалить нельзя (сначала `archived: true`). Окно вхождений `GET /v1/habits` — `[today-59, today]` в TZ пользователя; стрики и календарь считает клиент общей функцией `packages/shared/src/lib/habit.ts`.

## Health

| Метод и путь     | Назначение                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `GET /v1/health` | `{ status: 'ok', version, env }` — без авторизации; используется фронтендом и мониторингом |

## Структура NestJS-модулей

```
apps/api/src/
  main.ts                    # bootstrap, префикс /v1, CORS, shutdown hooks
  app.module.ts
  db/                        # drizzle client, schema, миграции
  modules/
    auth/                    # контроллер, сервис, guards, strategy (jwt)
    users/                   # /v1/me
    folders/  lists/  sections/
    tasks/                   # + subtasks внутри (единый агрегат)
    tags/
    habits/
    health/
  common/                    # фильтры ошибок, zod-пайпы, декораторы, позиционные хелперы
```

Запланированные модули (см. roadmap): `attachments/` (+ s3-клиент), `push/`, `worker/` (cron: напоминания, чистка).

Принятые внутри модулей правила: контроллер тонкий (только HTTP-слой), вся логика в сервисе, доступ к БД только через сервисы, zod-схемы запросов — из `@plana/shared`, маппинг DTO → camelCase Drizzle в сервисе.
