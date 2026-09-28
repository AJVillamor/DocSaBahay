# DokSaBahay

A fictional telehealth prototype.

## Platform

Desktop-oriented, responsive web app. Design for 1280px+ first; every page stays fully usable down to 360px.

## Stack (do not substitute)

- **pnpm monorepo**:
  - `apps/web` — Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form
  - `apps/api` — NestJS, TypeScript, Prisma
  - `packages/shared` — shared enums, types, Zod schemas
- **Database**: PostgreSQL 16 via Docker Compose. Prisma ORM in `apps/api`.
- **Auth**: application-managed email + password. argon2 hashing. JWT access token (15 min) + rotating refresh token (7 days, stored hashed in DB). Both in httpOnly, SameSite=Lax cookies.
- **API**: REST with JSON over HTTP(S) for all frontend–backend communication. Every read and write is a REST endpoint.
- **Real-time**: a NestJS WebSocket gateway (socket.io) only pushes "something changed" hints; the client then refetches over REST. Every real-time UI must still work via polling if the socket disconnects.
- **Dates**: Luxon. Store all timestamps as UTC (`timestamptz`); display in the browser's timezone.
- **Tests**: Jest + Supertest (API), Playwright (E2E).

## Hard rules

- **No external services**: no external CMS, analytics, auth provider, email/SMS/push, file or image hosting, calendar, scheduling, AI, maps, or video conferencing. No CDN fonts, scripts, or images. All assets live in `apps/web/public` or are bundled. Use system fonts or `next/font/local`.
- All business rules (authorization, availability, booking conflicts, state transitions) are enforced in NestJS. The frontend may pre-validate but is never trusted.
- Roles: `PATIENT`, `DOCTOR`, `ADMIN`. Admins are created only by the seed script; no public admin registration.
- Validate every request (class-validator DTOs with `whitelist` + `forbidNonWhitelisted`). Errors return JSON `{ statusCode, message, code }`.
- Never log passwords, tokens, or clinical note content.
- Avatars are generated initials with a deterministic background color. No file uploads.
- This repo uses OpenSpec. Read `openspec/specs/` for current behavior before changing code.
- No AI SDKs, AI API calls or AI features anywhere in the app. AI tools are for development only.
- Local deployment: `docker compose up --build` must run web, api and PostgreSQL.

## Code quality

- **Modular**: one NestJS module per feature (controller, service, DTOs, tests); frontend code grouped by feature.
- **Documented**: TSDoc on every exported service method and non-obvious function.
- **Error handling**: typed domain exceptions mapped to HTTP status codes by the global exception filter; no empty catch blocks; React error boundaries plus loading, empty and error states on every page.

## Working style

- Before coding, restate the task and list the files you will create or change. If anything is ambiguous, ask instead of guessing.
- Keep changes scoped to the current task. Do not refactor unrelated code.
- When finished: run lint, type-check, and tests; report results and give manual verification steps.
