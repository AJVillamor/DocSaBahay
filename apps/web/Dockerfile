# syntax=docker/dockerfile:1
# Build context: repository root (see docker-compose.yml).

FROM node:22-bookworm-slim AS base
RUN npm install -g pnpm@12.6.0
WORKDIR /app

# ---- build: install, compile shared + Next.js standalone output ----
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN pnpm install --frozen-lockfile --filter @doksabahay/web...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
# Rewrites are resolved at build time, so the API target is a build argument.
ARG API_URL=http://api:4000
# The browser's direct target for the notifications WebSocket (see NotificationsGateway) —
# unlike API_URL above, this must be reachable from the browser, not just the web container.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV API_URL=${API_URL} NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @doksabahay/shared build && pnpm --filter @doksabahay/web build

# ---- runtime: standalone server only ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
