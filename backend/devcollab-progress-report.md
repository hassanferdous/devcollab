# DevCollab — Progress Report & Week Plan

_Updated 2026-07-24 (originally 2026-07-13). Measured against `devcollab-weekly-guide.md` (6-week roadmap)._

> **Since the last report (07-22 → 07-24):** **task filtering/sorting** shipped — `GET /projects/:projectId/tasks` now accepts `status`, `priority`, `assignee_ids`, `sort`, and `order`, applied as a single dynamic filtered/sorted/paginated query in `TaskServices.getAll`. **DB indexes** on the filter columns are still outstanding.

> **Prior report (07-13 → 07-22):** only **rate limiting** shipped (commit `e63d6b1`) — Day 1 of that week's plan. Days 2–6 (filtering/sorting, indexes, RabbitMQ) did **not** land; remaining commits were chores (workspace cleanup, `.gitignore`).

> **Note on divergence:** the actual build followed the roadmap's _concepts_ but not its exact tooling — **Drizzle ORM** (not Knex), **CASL** for RBAC (not hand-rolled middleware), integer PKs (not UUID), refresh tokens stored **directly in Redis**, plus **Google OAuth** and a **full TanStack Start frontend** that aren't in the guide at all.

---

## 1. Progress overview

| Week | Theme                                         | Status         | %     |
| ---- | --------------------------------------------- | -------------- | ----- |
| 1    | Setup & Authentication                        | ✅ Complete    | ~100% |
| 2    | Projects & Tasks (CRUD + RBAC + transactions) | 🟡 Mostly done | ~80%  |
| 3    | Real-time (Socket.io)                         | 🟡 Mostly done | ~75%  |
| 4    | Redis & Caching (+ rate limiting)             | 🟡 Mostly done | ~90%  |
| 5    | Message Broker (RabbitMQ)                     | 🔴 Not started | 0%    |
| 6    | Docker & Deployment                           | 🟡 Partial     | ~40%  |

After a June 18 → July 22 pause, feature work resumed with **rate limiting** (07-22). RabbitMQ (Week 5) remains untouched and is now the critical path.

---

## 2. What's done

**Week 1 — Auth (complete)**

- Register, login, JWT access + refresh tokens, **access-token rotation**, auth middleware, `GET /auth/me`.
- Refresh tokens validated against Redis (`refresh_token:${userId}`); logout invalidates.
- Seed data (`src/scripts/seed.ts`). **Bonus:** Google OAuth via Passport.

**Week 2 — Projects & Tasks (partial)**

- Project + Task CRUD; nested `/projects/:projectId/tasks`.
- RBAC via CASL (`admin`/`member`/`viewer`) — `project/ability.ts` + `project-access.ts`.
- **Transactions + activity log:** task create/update/delete each wrap in `db.transaction` and write `task_activity_log` atomically. Project service also transactional.
- Pagination (`withPagination`, `paginationSchema`).
- **Task filtering + sorting (07-24):** `GET /projects/:projectId/tasks` accepts `status`, `priority`, `assignee_ids`, `sort` (`created_at`/`updated_at`/`due_date`), `order` (`asc`/`desc`). `TaskServices.getAll` builds a dynamic `and(...)` filter + `orderBy` in one filtered/sorted/paginated query (`count(*) over()` for totals); `assignee_ids` filters via a subquery on `task_members` (no join → no dropped/duplicated tasks). Swagger query params documented. Composes with the version-keyed cache (key already hashes query params).

**Week 3 — Real-time (partial)**

- Socket.io server, JWT handshake auth, `/project` namespace, `project:${id}` rooms.
- `task:created` / `task:updated` / `task:deleted` broadcast from the task service.
- **Online presence** (`presence:updated`) and **typing indicator** (`user:typing` / `user:typing-stop`).

**Week 4 — Redis & Caching (mostly done)**

- Cache-aside helper `getOrSet` with HIT/MISS logging.
- Single-entity caches (`user:${id}`, `project:${id}`, 300s).
- **Version-keyed task-list cache:** `tasks:${projectId}:v:${version}:…`, invalidated by `incr(tasks:${projectId}:version)` on every task mutation.
- Refresh tokens in Redis (Week 4 Day 5 already satisfied).
- **Rate limiting (07-22, `e63d6b1`)** — Redis-backed via `express-rate-limit` + `rate-limit-redis`, reusing `redisClient`. `src/middlewares/rate-limiter.ts` exports a `createLimiter` factory + per-endpoint limiters: `loginLimiter` / `registerLimiter` / `refreshTokenLimiter` / `otpLimiter` / `forgotPasswordLimiter` / `resetPasswordLimiter` (auth routes) and `apiLimiter` (100/min on `/api/v1`, skips `/health` + `/`). 429s go through `ApiResponse.error` (`RATE_LIMIT_EXCEEDED`); `trust proxy` set in `server.ts`. _Went beyond the planned single `authLimiter` — each sensitive auth route has its own bucket._

**Week 6 — Docker (partial)**

- `Dockerfile`, `compose.yaml` (backend + postgres + redis), env validation that fails fast (`env.schema.ts`).

---

## 3. What's left

| Gap                                                                                     | Week | Size            |
| --------------------------------------------------------------------------------------- | ---- | --------------- |
| ~~Task **filtering/sorting** (`status`/`priority`/`assignee`/`sort`/`order`)~~           | 2    | ✅ Done (07-24) |
| **DB indexes** on FK/filter columns                                                     | 2    | S               |
| **File attachments** (multer + `task_attachments`)                                      | 2    | M               |
| **Team chat** + `messages` persistence (`message:send`/`message:new`, history endpoint) | 3    | M               |
| ~~**Rate limiting** on auth endpoints (Redis-backed)~~                                  | 4    | ✅ Done (07-22) |
| **RabbitMQ**: broker, publisher, email worker, DLQ, `task_due_soon` cron                | 5    | L               |
| **Nginx** reverse proxy                                                                 | 6    | M               |
| Compose: `worker` + `rabbitmq` services, health checks, auto-migrate on startup         | 6    | M               |

_Aside:_ frontend `.env` targets `:8000`, but backend runs `APP_PORT=8001` with CORS origin `:3000` — reconcile when working on deploy.

---

## 4. Plan for this week (2026-07-22 → 07-28)

**Approach: hybrid** — close the last fast Week 2 gap (Day 1), then commit the rest of the week to Week 5 (RabbitMQ), which is the critical path. Conventions: TypeScript ESM, Drizzle, ioredis, Zod, `@/…` aliases, pnpm.

> Rate limiting (last week's Day 1) is **done** — see §2. This plan picks up at what was Day 2.

### Day 1 — DB indexes _(Week 2)_

> Task filtering/sorting is **done** (07-24) — `taskFilterSchema` wired into `GET /`, `TaskServices.getAll` builds a dynamic `and(...)` + `orderBy` in one query, `assignee_ids` via a `task_members` subquery, Swagger documented. Cache composes (key hashes query params). Indexes remain.

- Add Drizzle indexes in `task.schema.ts` (`tasks`: project_id, status, priority; `task_members`: user_id); `drizzle-kit generate` + migrate.
- ✔ Filtered/sorted/paginated query returns correct data; MISS→HIT in logs.

### Day 2 — RabbitMQ connection _(Week 5)_

- Add `rabbitmq:3-management-alpine` to `compose.yaml` + healthcheck; `backend.depends_on` rabbitmq **and** redis.
- `RABBITMQ_URL` in `.env`/`.env.example` + `env.schema.ts`.
- `src/config/rabbitmq.ts` (`connect()`/`getChannel()`, amqplib), called in `server.ts` startup. Add `amqplib` (+ types).
- ✔ Boots + logs connected; UI at `:15672`.

### Day 3 — Publisher + queue topology _(Week 5)_

- `src/queues/setup.ts`: DLX + `dlq.notifications`, exchange `notifications` + `q.email.notifications` with dead-letter args.
- `src/queues/publishers/notification.publisher.ts`: `publishTaskAssigned(...)` (persistent).
- Hook `TaskServices.addAssignees` → look up assignee email via **`UserServices.getById`** + project name → publish.
- ✔ Assigning a task enqueues a message.

### Day 4 — Email worker _(Week 5)_

- Add `nodemailer` (+ types) + Mailtrap SMTP env vars.
- `src/workers/email.worker.ts`: separate entry, `prefetch(1)`, consume queue, `ack`/`nack(→DLQ)`, switch on `payload.type`.
- `package.json` `worker` script + `worker` service in `compose.yaml`.
- ✔ Assign task → email in Mailtrap, message acked.

### Day 5 — DLQ + `task_due_soon` cron _(Week 5, stretch)_

- Force a failure → verify message lands in `dlq.notifications`.
- `node-cron` hourly: tasks due within 24h + assignee → publish `task_due_soon`; worker emails reminder.
- ✔ Messages survive broker restart (durable + persistent).

**Out of scope this week:** file attachments, team chat, Nginx, compose health checks/auto-migrate.

---

## 5. End-of-week verification

1. `pnpm dev` boots clean — Postgres + Redis + RabbitMQ all connect.
2. Rate limit (already shipped): 6 rapid logins → 429 (`loginLimiter`, max 5).
3. Task list filter + sort + paginate correct; cache MISS→HIT.
4. Assign task → email in Mailtrap; RabbitMQ queue drained.
5. Forced worker failure → message in `dlq.notifications`.
6. `docker compose up` runs backend + postgres + redis + rabbitmq + worker.
