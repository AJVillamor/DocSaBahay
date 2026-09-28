# syntax=docker/dockerfile:1
# Build context: repository root (see docker-compose.yml).

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.6.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
# The postinstall hook runs `prisma generate`, so the schema must exist first.
COPY apps/api/prisma apps/api/prisma

# ---- build: full install, compile shared + api ----
FROM base AS build
RUN pnpm install --frozen-lockfile --filter @doksabahay/api...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @doksabahay/shared build && pnpm --filter @doksabahay/api build

# ---- runtime: production deps only ----
FROM base AS runtime
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter @doksabahay/api...
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
# Files stay root-owned (read-only for the app); the process runs unprivileged.
USER node
WORKDIR /app/apps/api
EXPOSE 4000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
