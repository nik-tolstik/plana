# Plana — деплой и окружения

Схема: **один репозиторий GitHub**, **один проект Vercel** (фронт), **один проект Railway** (API + PostgreSQL × 2 окружения). Ветки: `develop` → develop-окружения, `main` → production. Настроить один раз в порядке ниже.

## 1. GitHub

1. Создать репозиторий (например, `plana`), запушить `main`.
2. Создать ветку `develop` и запушить.
3. Настройки репозитория → Branches → Add rule для `main`: «Require a pull request before merging» + «Require status checks to pass» (чек CI). То же опционально для `develop`.

## 2. Railway (API + БД)

1. Новый проект `plana`. Внутри создать два environment: `develop` и `production` (Railway создаёт production по умолчанию; develop — New Environment).
2. В каждом окружении добавить плагин **PostgreSQL** (Database). Переменная `DATABASE_URL` появится в окружении автоматически.
3. В каждом окружении создать сервис **API из GitHub-репозитория**:
   - Builder: **Dockerfile**;
   - Dockerfile Path: `apps/api/Dockerfile`;
   - Root Directory: оставить пустым (корень репозитория — контекст сборки);
   - Watch paths (чтобы не пересобирать API на изменения фронтенда): `apps/api/**`, `packages/**`, `pnpm-lock.yaml`;
   - Branch: `develop` для develop-окружения, `main` для production.
4. Переменные окружения API (в каждом окружении):
   - `PORT=3000` (Railway выставляет сам, можно не задавать);
   - `APP_VERSION` — версия релиза (для /v1/health);
   - `CLIENT_ORIGIN` — URL фронта (см. шаг 3; через запятую можно несколько);
   - `DATABASE_URL` — уже есть от плагина;
   - будущие: `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `VAPID_*`, `S3_*` (см. `apps/api/.env.example`).
5. Networking: сгенерировать домен сервиса (например, `plana-api-develop.up.railway.app` и `plana-api.up.railway.app`).
6. Production-БД: включить бэкапы (Settings → Backups).
7. Миграции БД: выполняются командой `pnpm --filter @plana/api db:migrate` с `DATABASE_URL` окружения (локально из репозитория или стартовым скриптом сервиса — выбрать на шаге реализации auth).

## 3. Vercel (фронт)

1. **Один** проект `plana` из того же репозитория.
2. General → Root Directory: `apps/web` (Vercel сам поднимется на pnpm-workspace из корня).
3. Production Branch: `main`.
4. Домены: production — `plana.vercel.app` (выдаётся автоматически); develop получает стабильный branch-URL вида `plana-git-develop-<team>.vercel.app`.
5. Переменные окружения:
   - Environment **Production**: `VITE_API_URL=https://<railway-production-домен>`;
   - Environment **Preview**: `VITE_API_URL=https://<railway-develop-домен>`;
   - (Development — локальный дефолт `http://localhost:3000` зашит в схему env).

## 4. Проверка цепочки

1. PR в `develop` → зелёный CI → merge → Vercel делает preview-деплой develop-ветки, Railway пересобирает API в develop-окружении.
2. Открываем develop-URL фронта: на главной виджет «✓ API: ok · версия · окружение» подтверждает связку фронт↔API.
3. PR `develop` → `main` → merge → production-деплои.

## 5. Google OAuth (когда дойдём до auth)

1. Google Cloud Console → OAuth consent screen + OAuth Client (Web application).
2. Authorized redirect URIs:
   - `https://<railway-production-домен>/v1/auth/google/callback`
   - `https://<railway-develop-домен>/v1/auth/google/callback`
   - `http://localhost:3000/v1/auth/google/callback` (локальная разработка)
3. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — в переменные обоих окружений Railway.

## 6. Обслуживание

- Логи/статусы: Railway → Deployments/Metrics; Vercel → Deployments.
- Откат: Railway → Deployments → Redeploy предыдущего; Vercel → Instant Rollback.
- Бэкапы production-БД: Railway → PostgreSQL → Backups.
