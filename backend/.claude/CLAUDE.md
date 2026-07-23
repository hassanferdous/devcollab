# DevCollab — Backend

Real-time collaborative project/task manager. **TypeScript (ESM), Express 5, PostgreSQL + Drizzle ORM, Redis (ioredis), Socket.io, Passport (local + Google OAuth), Zod, CASL.** Package manager: **pnpm**. Entry point: `src/server.ts`.

## Commands

| Command                       | Purpose                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                    | Dev server with hot reload (`tsx watch src/server.ts`)                           |
| `pnpm build`                  | Bundle to `dist/` (`tsup`, ESM, minified + sourcemaps)                           |
| `pnpm start`                  | Run compiled prod build (`NODE_ENV=production node dist/server.js`)              |
| `pnpm seed`                   | Seed the database (`src/scripts/seed.ts`)                                        |
| `pnpm create:domain <name>`   | Scaffold a new domain (see **Domain structure**)                                 |
| `pnpm lint` / `pnpm lint:fix` | ESLint (flat config, `eslint.config.js`)                                         |
| `pnpm exec drizzle-kit ...`   | Migrations — config `drizzle.config.ts`, schema dir `src/db`, output `./drizzle` |

Docker: `compose.yaml` (+ `compose.dev.yaml` / `compose.prod.yaml`) — services `backend`, `postgresql`, `redis`.

## Directory map (`src/`)

| Path                   | Purpose                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server.ts`            | Entry: CORS → Socket.io init → passport → parsers → routes `/api/v1` → swagger → error handlers → DB connect (retry w/ backoff) → listen           |
| `config/`              | `index.ts` (JSON+env config), `env.schema.ts` (Zod env validation), `db.ts` (Drizzle client), `redis.ts` (ioredis client), `swagger.ts`            |
| `db/`                  | Drizzle table schemas (`*.schema.ts`)                                                                                                              |
| `domains/v1/<domain>/` | Feature domains: `auth`, `user`, `project`, `task`                                                                                                 |
| `routes/v1.ts`         | Mounts domain routers under `/api/v1`; health/welcome routes; 404 fallback                                                                         |
| `middlewares/`         | `auth.ts`, `validator.ts`, `project-access.ts`, `global-error-handler.ts`                                                                          |
| `socket/`              | `io.ts`, `base.nsp.ts`, `project.nsp.ts`, `auth.socket.ts`                                                                                         |
| `utils/`               | `response.ts`, `error.ts`, `cache.ts`, `jwt.ts`, `cookie.ts`, `password-hash.ts`, `getRequestContext.ts`, `withPagination.ts`, `formatZodError.ts` |
| `validator/`           | Shared Zod schemas: `pagination.ts`, `params.ts`                                                                                                   |
| `lib/logger.ts`        | Winston logger (file transports in `logs/`)                                                                                                        |
| `scripts/`             | `generate-domain.js`, `seed.ts`                                                                                                                    |

**Path aliases** (tsconfig): `@/*` → `src/*`, plus `@domains/*`, `@middlewares/*`, `@utils/*`, `@db/*`.

## Domain structure (the core pattern)

Every domain under `src/domains/v1/<domain>/`:

- **`api.ts`** — Express router + Swagger JSDoc. Each route is a middleware chain followed by a thin handler that calls the service and returns via `ApiResponse`. Handlers do **not** try/catch — errors bubble to the global handler.
- **`service.ts`** — Drizzle data access + business logic. Exports a `<Domain>Services` object and `InferSelectModel`/`InferInsertModel` types. Socket emissions happen here (see task service).
- **`validation.ts`** — Zod schemas.
- **`ability.ts`** — CASL rules (project domain only).

Scaffold new domains with `pnpm create:domain <name>` — generates `api.ts`/`service.ts`/`validation.ts` + `src/db/<name>.schema.ts`. ⚠️ The generated skeleton uses `PUT` + numeric `id` + a `getAll`; real domains diverge (e.g. `task` uses `PATCH` and mounts under `/projects/:projectId/tasks`). Treat it as a starting point, not the convention.

## Request lifecycle & conventions

**Standard handler chain:** `auth` → `validate({ body, params, query })` → `projectAccess("Project" | "Task")` → handler.

**Response envelope** — always use `ApiResponse` (`src/utils/response.ts`), never raw `res.json`:

```ts
ApiResponse.success(res, "message", data, StatusCodes.OK, pagination?)
ApiResponse.error(res, "message", StatusCodes.NOT_FOUND, "ERROR_TYPE", err?)
```

Shape: `{ success, statusCode, message, data, pagination? }`. Errors add `error.reference` (a generated ID) plus stack/context **only in development**.

**Errors** — throw with `throwError(msg, statusCode, type?)` (`src/utils/error.ts` → `AppError`). Caught by `errorHandler` + `entityParseHandler` (`src/middlewares/global-error-handler.ts`), which also maps Postgres `23505` unique-violations.

**Validation** — `validate()` (`src/middlewares/validator.ts`) runs Zod `.parse()` on body/query/params and throws a `VALIDATION_ERROR`. Reuse shared schemas in `src/validator/` (pagination, id params).

## Auth

- JWT **access (15m)** + **refresh (7d)**. Helpers: `src/utils/jwt.ts`; HttpOnly cookies `src/utils/cookie.ts`; bcrypt `src/utils/password-hash.ts`.
- `auth` middleware (`src/middlewares/auth.ts`): reads `access_token` from cookie **or** `Authorization: Bearer`, verifies the JWT, **and** confirms `refresh_token:${userId}` still exists in Redis (logout deletes it → invalidates the session). Attaches `req.user`.
- Passport strategies in `src/domains/v1/auth/passport/` (local + Google OAuth).
- Routes: `register`, `login`, `logout`, `refresh-token`, `google` + `google/callback`, `forgot-password` / `verify-otp` / `reset-password`, `me`.

## Authorization (CASL)

`src/domains/v1/project/ability.ts` + `src/middlewares/project-access.ts`. Roles: `admin | member | viewer`. `projectAccess(subject)` verifies project membership and builds the ability context on the request. Rules: **admin** → manage all; **member** → CRUD tasks + read project; **viewer** → read only.

## Data model (`src/db/`)

| Table                  | Notes                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `usersTable`           | `email` unique; `provider` (`credential` default / `google`); `password_hash`, `avatar`, `isActive`; soft-delete `deletedAt`                     |
| `projectsTable`        | FK `owner_id`; `status` enum `active`/`archived`; unique `(owner_id, name)`                                                                      |
| `projectMembersTable`  | FK `project_id`, `user_id`; `role` enum `admin`/`member`/`viewer`; unique `(project_id, user_id)`                                                |
| `tasksTable`           | `status` `pending`/`in_progress`/`completed`, `priority` `low`/`medium`/`high`/`urgent`; FKs `project_id`, `created_by`; `start_date`/`due_date` |
| `taskMembersTable`     | Task assignees (FK `task_id`, `user_id`)                                                                                                         |
| `taskActivityLogTable` | `action` enum `created`/`updated`/`deleted`; `old_values`/`new_values` JSONB                                                                     |
| `authsTable`           | Legacy/minimal (`id`, `name`) — appears unused                                                                                                   |

FKs cascade on delete (activity-log `user_id` sets null).

## Redis caching

Client `src/config/redis.ts`; cache-aside helper `getOrSet(key, ttl, fetchFn)` in `src/utils/cache.ts` (logs HIT/MISS, JSON-serializes).

- Single-entity: `user:${id}`, `project:${id}` (300s TTL) — `redisClient.del(...)` on mutate.
- Auth: `refresh_token:${userId}` (TTL from `JWT_REFRESH_EXPIRES_IN`).
- **Versioned invalidation for task lists** (`src/domains/v1/task/api.ts`): read key is
  `tasks:${projectId}:v:${version}:${JSON.stringify(query)}` (60s TTL), where `version` comes from `tasks:${projectId}:version`. **Every task create/update/delete/assignee change calls `redisClient.incr(tasks:${projectId}:version)`** to invalidate all paginated variants at once. When you add a task-mutating route, bump the version too.

## Socket.io

- `src/socket/io.ts` — builds the HTTP server from the Express app, creates the `io` server (CORS from `CLIENT_URL`), registers the project namespace, and exposes it via `app.set("projectNsp", nsp)`. Handlers reach it with `req.app.get("projectNsp")`.
- `src/socket/base.nsp.ts` — abstract namespace base; `project.nsp.ts` — namespace **`/project`**, room **`project:${projectId}`**.
- `src/socket/auth.socket.ts` — handshake auth: verifies JWT + Redis refresh token + project membership.
- Events: `project:joined`, `user:typing` / `user:typing-stop`, `presence:updated` (deduped user list + count), `task:created` (emitted from the task service on create).

## Config & environment

`src/config/index.ts` merges `config.<NODE_ENV>.json` (app/cors/logging) with Zod-validated env from `src/config/env.schema.ts` (loads `.env` then `.env.<NODE_ENV>`, exits on invalid env). See `.env.example`. Key vars: `NODE_ENV`, `APP_PORT` (8001), `CLIENT_URL`, `POSTGRES_*`, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (min 10 chars) + `*_EXPIRES_IN`, `GOOGLE_CLIENT_ID`/`SECRET`, `REDIS_HOST`/`REDIS_PORT`. DB URI (`src/config/db.ts`) uses host `postgresql` (the Docker service name). Swagger UI via `src/config/swagger.ts`.

## Gotchas

- **No test suite** is configured yet.
- Strict TS with `noUnusedLocals`/`noUnusedParameters` — unused vars fail the build.
- Formatting: Prettier (`.prettierrc`) + ESLint 10 flat config.
- Logging: Winston (`src/lib/logger.ts`, files under `logs/`) + Morgan HTTP access logs.
