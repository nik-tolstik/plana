# Backend-стек для Plana — исследование и рекомендация

Дата: 2026-10-09. Ограничения, заданные владельцем: деплой на **Railway**, БД **PostgreSQL**, фронтенд React + Vite + TypeScript на Vercel, разработка полностью через AI-агентов (значит: важны конвенции, строгая типизация, автогенерируемая документация API).

## Что уже решено

- БД: PostgreSQL (плагин Railway, по инстансу на develop и production)
- Frontend: React 19 + Vite + TypeScript (Vercel)
- UI: Base UI (v1.0.0 stable с 2025-12-11, 35 headless-компонентов, сейчас v1.8.x) — с shadcn или без, решим на этапе дизайна

## Фреймворк: NestJS (рекомендация)

| Вариант                   | Плюсы                                                                                                                                                                                                                           | Минусы для нас                                                                                   | Вердикт                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| **NestJS 11 (Node + TS)** | Готовая архитектура: модули, DI, guards, interceptors, pipes. Swagger (OpenAPI) декораторами. Экосистема: BullMQ, WebSocket, cron, rate-limit. Консенсус обзоров 2026: лучший выбор для долгоживущих структурированных бэкендов | Бойлерплейт; медленнее Fastify в микробенчмарках (для MVP неважно)                               | ✅ **Рекомендую**          |
| Fastify 5                 | Максимальная скорость, лёгкий                                                                                                                                                                                                   | Архитектуру собираешь сам → AI-агенты без жёстких конвенций будут выдавать разнородный код       | Альтернатива               |
| Hono                      | TS-first, лёгкий, отличный DX                                                                                                                                                                                                   | Маловато «взрослых» инструментов для монолита (DI, swagger-декораторы, jobs)                     | Не рекомендую для монолита |
| Express 5                 | Знаком всем                                                                                                                                                                                                                     | Устаревший паттерн, нет структуры из коробки                                                     | ❌                         |
| Go (Echo/Fiber)           | Производительность, память                                                                                                                                                                                                      | Теряется шаринг типов с TS-фронтом, контракт только через OpenAPI-codegen; больше трения для MVP | ❌                         |

Ключевой аргумент для NestJS именно в нашем случае: **проект пишут AI-агенты по документации**. Жёсткие конвенции NestJS (модуль → controller → service → repository) делают код однородным независимо от того, какой агент его сгенерировал, а Swagger-декораторы дают живую документацию API бесплатно. При желании внутрь NestJS можно поставить Fastify-адаптер вместо Express — скорость без потери структуры.

Runtime: **Node.js 24 LTS** (не Bun) — максимальная совместимость с Drizzle и стабильность на Railway; актуальная LTS с октября 2025 (первоначально записали Node 22, уточнено 2026-10-09 при создании скелета; установлен NestJS 12).

## ORM: Drizzle (рекомендация), Prisma — близкая альтернатива

|                    | Drizzle ORM                        | Prisma 6                               |
| ------------------ | ---------------------------------- | -------------------------------------- |
| Схема              | TS-код, SQL-подобные типы          | собственный DSL `schema.prisma`        |
| Codegen            | не нужен                           | нужен `prisma generate`                |
| Производительность | быстрее (тонкая обёртка над SQL)   | медленнее на сложных запросах          |
| Миграции           | drizzle-kit (нормальные в 2026)    | самый зрелый инструмент миграций       |
| guardrails         | меньше, больше SQL-ответственности | больше, сложнее выстрелить себе в ногу |
| Консенсус 2026     | лидер для новых проектов           | «polished DX», близкий второй          |

Рекомендую **Drizzle**: TS-native (один язык на весь монорепо, нет лишнего codegen-шага в CI), лёгкий, и SQL-подобные запросы агенты пишут надёжно. Если владельцу важнее максимальные guardrails и самый зрелый миграционный инструмент — Prisma тоже отличный выбор, оба production-ready.

## Сопутствующие слои (предложение, обсуждается в вопросах)

| Слой               | Предложение                                                                                                         | Альтернатива                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Валидация          | **zod** — одна библиотека схем на фронт и бэк (или zod + nestjs-zod)                                                | class-validator (классика NestJS, но схемы не переиспользуются на фронте) |
| API-стиль          | **REST + OpenAPI** (Swagger из декораторов NestJS) + типизированный клиент на фронте через openapi-typescript/orval | tRPC (end-to-end типы без кодгена, но жёсткая связка клиента и сервера)   |
| Auth               | Своя: email+пароль (argon2), access+refresh токены, refresh в БД; Google OAuth — позже                              | Clerk/Auth0 (быстро, но внешний вендор и оплата)                          |
| Realtime           | MVP: polling через TanStack Query; заложить SSE на будущее                                                          | WebSocket (socket.io) — оправдан только с совместными списками            |
| Фоновые задачи     | Напоминания → cron-воркер на Railway (отдельный сервис или cron-schedule); BullMQ+Redis если задач много            | —                                                                         |
| Файловое хранилище | Railway Object Storage (S3-совместимый, приватные bucket + presigned URLs)                                          | Cloudflare R2 (бесплатный egress)                                         |
| Тесты              | Vitest (unit) + Supertest (e2e API) + Playwright (e2e UI)                                                           | —                                                                         |

## Рекомендуемый стек (итог)

```
NestJS 11 + TypeScript (strict) на Node 22 LTS
Drizzle ORM + drizzle-kit (миграции) → PostgreSQL 16+ (Railway)
zod для валидации, @nestjs/swagger для OpenAPI
Swagger UI на /docs (только в develop-окружении)
Монорепо pnpm: apps/web (Vite), apps/api (NestJS), packages/shared (zod-схемы и типы контрактов)
```

Источники: [Encore: NestJS vs Fastify 2026](https://encore.dev/articles/nestjs-vs-fastify), [Stackademic: NestJS vs Fastify vs Hono 2026](https://blog.stackademic.com/nestjs-vs-fastify-vs-hono-in-2026-the-typescript-backend-choice-is-changing-c7a7e45ebce6), [OrtemTech: Top Node.js Frameworks 2026](https://ortemtech.com/blog/top-nodejs-frameworks-2026), [Kostra: Prisma vs Drizzle 2026](https://kostra.io/blog/prisma-vs-drizzle-comparison), [MakerKit: Drizzle vs Prisma 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma), [Base UI releases](https://base-ui.com/react/overview/releases).
