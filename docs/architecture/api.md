# Plana — структура API

REST поверх NestJS, префикс `/v1`, OpenAPI/Swagger генерируется декораторами (`/docs` — только в develop-окружении). Схема БД: `docs/architecture/erd.md`. Контракты запросов/ответов (zod-схемы) живут в `packages/shared` и переиспользуются фронтом.

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
- Rate limiting: NestJS Throttler — 100 req/мин на пользователя, 20 req/мин на auth-эндпоинты.

## Auth

| Метод и путь                   | Назначение                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /v1/auth/register`       | `{ email, password, name }` → `{ accessToken, refreshToken, user }`. Создаёт Inbox-список.                                                                               |
| `POST /v1/auth/login`          | `{ email, password }` → токены + user                                                                                                                                    |
| `POST /v1/auth/refresh`        | `{ refreshToken }` → новые токены (старый отзывается)                                                                                                                    |
| `POST /v1/auth/logout`         | `{ refreshToken }` — отзывает одну сессию                                                                                                                                |
| `POST /v1/auth/logout-all`     | отзывает все сессии пользователя                                                                                                                                         |
| `GET /v1/auth/google`          | 302 на Google OAuth (scope: openid email profile, `state` — одноразовый)                                                                                                 |
| `GET /v1/auth/google/callback` | обмен кода; если Google-email найден — вход, иначе — регистрация+связка; 302 на фронт `/?authCode=...`; фронт обменивает `authCode` через `POST /v1/auth/oauth/exchange` |

`POST /v1/auth/oauth/exchange`: `{ authCode }` → токены + user (authCode одноразовый, 60 сек).

`GET /v1/auth/me` — дублируется как `GET /v1/me` (см. профиль) — используем `/v1/me`.

## Профиль

| Метод и путь    | Назначение                                                   |
| --------------- | ------------------------------------------------------------ |
| `GET /v1/me`    | текущий пользователь                                         |
| `PATCH /v1/me`  | `{ name?, timezone?, theme? }`                               |
| `DELETE /v1/me` | удаление аккаунта (каскад, подтверждение паролем на клиенте) |

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
| `PATCH /v1/sections/:id`      | `{ name?, position? }`                                    |
| `DELETE /v1/sections/:id`     | секция удаляется, задачи остаются в списке без секции     |

`GET /v1/folders` возвращает: папки, их списки и списки без папки + Inbox — всё для левого сайдбара за один запрос.

## Задачи

| Метод и путь                    | Назначение                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/tasks`                 | фильтры: `listId`, `smart` (`inbox` \| `today` \| `tomorrow` \| `next7` \| `all` \| `recent` \| `completed` \| `trash`), `sectionId`, `tagId`, `priority`, `q` (поиск ILIKE по title/description), `completed` (bool), `limit/offset`. Возвращает задачи с подзадками, тегами, числом вложений. |
| `POST /v1/tasks`                | `{ title, description?, priority?, dueDate?, dueTime?, rrule?, listId? (default Inbox), sectionId?, tagIds?, pinned? }`                                                                                                                                                                         |
| `GET /v1/tasks/:id`             | одна задача со всеми подзадачами, тегами, вложениями, напоминаниями                                                                                                                                                                                                                             |
| `PATCH /v1/tasks/:id`           | любые поля; `reminders` — массив `{ offsetMinutes }` (полная замена); `tagIds` — полная замена; `dueDate/dueTime/rrule` — сбрасывают `sent_occurrence_date` напоминаний                                                                                                                         |
| `DELETE /v1/tasks/:id`          | в корзину (`?purge=true` — сразу физически, доступно и из корзины)                                                                                                                                                                                                                              |
| `POST /v1/tasks/:id/restore`    | из корзины                                                                                                                                                                                                                                                                                      |
| `POST /v1/tasks/:id/complete`   | завершить (для повторяющейся — сдвиг вхождения, см. ERD)                                                                                                                                                                                                                                        |
| `POST /v1/tasks/:id/uncomplete` | вернуть в работу (у повторяющейся — удаляется последняя запись task_completions, due_date откатывается к ней)                                                                                                                                                                                   |
| `POST /v1/tasks/batch`          | `{ taskIds, action: 'complete' \| 'trash' \| 'restore' \| 'move', listId?, sectionId? }`                                                                                                                                                                                                        |
| `POST /v1/tasks/parse`          | `{ text }` → `{ title, dueDate?, dueTime?, rrule?, priority, tags: string[] }` — NLP-парсер для quick-add, ничего не создаёт                                                                                                                                                                    |

### Подзадачи и теги

| Метод и путь                      | Назначение                     |
| --------------------------------- | ------------------------------ |
| `POST /v1/tasks/:taskId/subtasks` | `{ title }`                    |
| `PATCH /v1/subtasks/:id`          | `{ title?, done?, position? }` |
| `DELETE /v1/subtasks/:id`         |                                |
| `GET /v1/tags`                    | все теги пользователя          |
| `PATCH /v1/tags/:id`              | `{ name?, position? }`         |
| `DELETE /v1/tags/:id`             | отвязывается от всех задач     |

Теги на задаче ставятся через `PATCH /v1/tasks/:id` (`tagIds`); несуществующие имена создаются неявно.

## Вложения

| Метод и путь                         | Назначение                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/tasks/:taskId/attachments` | `{ fileName, mimeType, sizeBytes }` → `{ id, uploadUrl }` — presigned PUT в Object Storage. Проверяет лимиты 10 МБ/файл, 100 МБ/пользователь и допустимые mime (изображения, pdf, тексты, архивы). |
| `POST /v1/attachments/:id/confirm`   | загрузка завершена → фиксирует `uploaded_at`                                                                                                                                                       |
| `GET /v1/attachments/:id/url`        | presigned GET (срок 1 час)                                                                                                                                                                         |
| `DELETE /v1/attachments/:id`         | метаданные + объект в бакете                                                                                                                                                                       |

## Web Push

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

## Health

| Метод и путь     | Назначение                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `GET /v1/health` | `{ status: 'ok', version, env }` — без авторизации; используется фронтендом и мониторингом |

## Структура NestJS-модулей

```
apps/api/src/
  main.ts                    # bootstrap, префикс /v1, CORS, Swagger (develop)
  app.module.ts
  db/                        # drizzle client, schema, миграции
  modules/
    auth/                    # контроллер, сервис, guards, strategies (jwt, google-oauth)
    users/                   # /v1/me
    folders/  lists/  sections/
    tasks/                   # + subtasks, reminders внутри (единый агрегат)
    tags/
    attachments/             # + s3-клиент
    push/                    # подписки + web-push отправка
    habits/
    worker/                  # cron: напоминания, чистка (отдельный процесс, тот же код)
  common/                    # фильтры ошибок, интерсепторы, декораторы
```

Принятые внутри модулей правила: контроллер тонкий (только HTTP-слой), вся логика в сервисе, доступ к БД только через сервисы, zod-схемы запросов — из `@plana/shared`, маппинг DTO → camelCase Drizzle в сервисе.
