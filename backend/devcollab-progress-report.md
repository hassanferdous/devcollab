# DevCollab — Progress Report & Week Plan

_Generated 2026-07-13. Measured against `devcollab-weekly-guide.md` (6-week roadmap)._

> **Note on divergence:** the actual build followed the roadmap's *concepts* but not its exact tooling — **Drizzle ORM** (not Knex), **CASL** for RBAC (not hand-rolled middleware), integer PKs (not UUID), refresh tokens stored **directly in Redis**, plus **Google OAuth** and a **full TanStack Start frontend** that aren't in the guide at all.

---

## 1. Progress overview

| Week | Theme | Status | % |
|---|---|---|---|
| 1 | Setup & Authentication | ✅ Complete | ~100% |
| 2 | Projects & Tasks (CRUD + RBAC + transactions) | 🟡 Mostly done | ~70% |
| 3 | Real-time (Socket.io) | 🟡 Mostly done | ~75% |
| 4 | Redis & Caching | 🟡 Mostly done | ~80% |
| 5 | Message Broker (RabbitMQ) | 🔴 Not started | 0% |
| 6 | Docker & Deployment | 🟡 Partial | ~40% |

Feature work stalled around **June 18**; commits since have been documentation only.

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
- Pagination (`withPaginationOptions`, `paginationSchema`).

**Week 3 — Real-time (partial)**
- Socket.io server, JWT handshake auth, `/project` namespace, `project:${id}` rooms.
- `task:created` / `task:updated` / `task:deleted` broadcast from the task service.
- **Online presence** (`presence:updated`) and **typing indicator** (`user:typing` / `user:typing-stop`).

**Week 4 — Redis & Caching (partial)**
- Cache-aside helper `getOrSet` with HIT/MISS logging.
- Single-entity caches (`user:${id}`, `project:${id}`, 300s).
- **Version-keyed task-list cache:** `tasks:${projectId}:v:${version}:…`, invalidated by `incr(tasks:${projectId}:version)` on every task mutation.
- Refresh tokens in Redis (Week 4 Day 5 already satisfied).

**Week 6 — Docker (partial)**
- `Dockerfile`, `compose.yaml` (backend + postgres + redis), env validation that fails fast (`env.schema.ts`).

---

## 3. What's left

| Gap | Week | Size |
|---|---|---|
| Task **filtering/sorting** (`status`/`priority`/`assignee`/`sort`/`order`) | 2 | S |
| **DB indexes** on FK/filter columns | 2 | S |
| **File attachments** (multer + `task_attachments`) | 2 | M |
| **Team chat** + `messages` persistence (`message:send`/`message:new`, history endpoint) | 3 | M |
| **Rate limiting** on auth endpoints (Redis-backed) | 4 | S |
| **RabbitMQ**: broker, publisher, email worker, DLQ, `task_due_soon` cron | 5 | L |
| **Nginx** reverse proxy | 6 | M |
| Compose: `worker` + `rabbitmq` services, health checks, auto-migrate on startup | 6 | M |

_Aside:_ frontend `.env` targets `:8000`, but backend runs `APP_PORT=8001` with CORS origin `:3000` — reconcile when working on deploy.

---

## 4. Plan for this week (2026-07-13 → 07-19)

**Approach: hybrid** — close fast, high-value gaps first, then begin Week 5 (RabbitMQ). Conventions: TypeScript ESM, Drizzle, ioredis, Zod, `@/…` aliases, pnpm.

### Day 1 — Rate limiting _(Week 4)_
- Add `express-rate-limit` + `rate-limit-redis`.
- `src/middlewares/rate-limiter.ts`: `authLimiter` (15 min / 10) + `apiLimiter` (1 min / 100), **reusing `redisClient`** as the store; errors via `ApiResponse.error`.
- Apply `apiLimiter` on `/api/v1` in `server.ts`; `authLimiter` on `login`/`register` in `auth/api.ts`.
- ✔ 11 rapid logins → 429.

### Day 2 — Task filtering/sorting + indexes _(Week 2)_
- `taskListQuerySchema` in `task/validation.ts` (pagination + `status`/`priority`/`assigned_to`/`sort`/`order`); wire into `GET /` in `task/api.ts`.
- `TaskServices.getAll`: dynamic `and(...)` + `orderBy` before `withPaginationOptions`; join `taskMembersTable` for `assigned_to`.
- Cache composes automatically (key already hashes query params).
- Add Drizzle indexes in `task.schema.ts` (`tasks`: project_id, status, priority; `task_members`: user_id); `drizzle-kit generate` + migrate.
- ✔ Filtered/sorted/paginated query returns correct data; MISS→HIT in logs.

### Day 3 — RabbitMQ connection _(Week 5)_
- Add `rabbitmq:3-management-alpine` to `compose.yaml` + healthcheck; `backend.depends_on` rabbitmq **and** redis.
- `RABBITMQ_URL` in `.env`/`.env.example` + `env.schema.ts`.
- `src/config/rabbitmq.ts` (`connect()`/`getChannel()`, amqplib), called in `server.ts` startup. Add `amqplib` (+ types).
- ✔ Boots + logs connected; UI at `:15672`.

### Day 4 — Publisher + queue topology _(Week 5)_
- `src/queues/setup.ts`: DLX + `dlq.notifications`, exchange `notifications` + `q.email.notifications` with dead-letter args.
- `src/queues/publishers/notification.publisher.ts`: `publishTaskAssigned(...)` (persistent).
- Hook `TaskServices.addAssignees` → look up assignee email via **`UserServices.getById`** + project name → publish.
- ✔ Assigning a task enqueues a message.

### Day 5 — Email worker _(Week 5)_
- Add `nodemailer` (+ types) + Mailtrap SMTP env vars.
- `src/workers/email.worker.ts`: separate entry, `prefetch(1)`, consume queue, `ack`/`nack(→DLQ)`, switch on `payload.type`.
- `package.json` `worker` script + `worker` service in `compose.yaml`.
- ✔ Assign task → email in Mailtrap, message acked.

### Day 6 — DLQ + `task_due_soon` cron _(Week 5, stretch)_
- Force a failure → verify message lands in `dlq.notifications`.
- `node-cron` hourly: tasks due within 24h + assignee → publish `task_due_soon`; worker emails reminder.
- ✔ Messages survive broker restart (durable + persistent).

**Out of scope this week:** file attachments, team chat, Nginx, compose health checks/auto-migrate.

---

## 5. End-of-week verification

1. `pnpm dev` boots clean — Postgres + Redis + RabbitMQ all connect.
2. Rate limit: 11 rapid logins → 429.
3. Task list filter + sort + paginate correct; cache MISS→HIT.
4. Assign task → email in Mailtrap; RabbitMQ queue drained.
5. Forced worker failure → message in `dlq.notifications`.
6. `docker compose up` runs backend + postgres + redis + rabbitmq + worker.
