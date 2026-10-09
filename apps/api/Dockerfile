# Контекст сборки — КОРЕНЬ монорепо (нужны pnpm-workspace и packages/*).
# В Railway: Dockerfile Path = apps/api/Dockerfile, Root Directory — пустой (корень).

FROM node:24-alpine AS build
RUN npm install -g pnpm@11.21.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @plana/shared build
RUN pnpm --filter @plana/api build
RUN pnpm --filter @plana/api deploy --prod /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
