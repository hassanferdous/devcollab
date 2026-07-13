# DevCollab — 6-Week Detailed Learning Guide

> **Stack:** Node.js · Express · PostgreSQL · Knex · Redis · RabbitMQ · Socket.io · Docker · Nginx  
> **Goal:** Build a fullstack team project management platform, one real feature per week.

---

## Week 1 — Project Setup & Authentication

### What you will build
A working auth system with registration, login, JWT access tokens, refresh tokens, and a protected route middleware. By the end of the week you can register a user, log in, get a token, and call a protected endpoint.

---

### Day 1 — Scaffold the project

**Goal:** A running Express server with proper folder structure, environment config, and developer tooling.

**Steps:**
1. Create the project folder and run `npm init -y`
2. Install core dependencies:
   ```
   npm install express dotenv cors helmet morgan
   npm install -D nodemon eslint
   ```
3. Create this folder structure:
   ```
   src/
   ├── config/         ← db.js, redis.js, env validation
   ├── middleware/     ← auth, error handler, validate
   ├── modules/
   │   ├── auth/       ← controller, service, routes
   │   ├── projects/
   │   ├── tasks/
   │   └── users/
   ├── utils/          ← jwt.js, response.js, logger.js
   └── app.js          ← Express setup
   index.js            ← entry point (starts server)
   .env
   .env.example
   .gitignore
   ```
4. Set up `app.js` — register middleware (cors, helmet, morgan, express.json)
5. Set up `index.js` — import app, listen on `process.env.PORT`
6. Add a `GET /health` route that returns `{ status: "ok" }`
7. Configure `nodemon` in `package.json` scripts:
   ```json
   "scripts": {
     "dev": "nodemon index.js",
     "start": "node index.js"
   }
   ```
8. Create `.env` with `PORT=3000` and test that `npm run dev` starts the server

**What to verify:** `curl http://localhost:3000/health` returns `{ "status": "ok" }`

---

### Day 2 — PostgreSQL + Knex setup

**Goal:** Database connection working, first migration file created and run successfully.

**Steps:**
1. Install Knex and the PostgreSQL driver:
   ```
   npm install knex pg
   ```
2. Create `knexfile.js` at the root:
   ```js
   require('dotenv').config();
   module.exports = {
     development: {
       client: 'pg',
       connection: process.env.DATABASE_URL,
       migrations: { directory: './src/database/migrations' },
       seeds:      { directory: './src/database/seeds' },
     }
   };
   ```
3. Add `DATABASE_URL=postgresql://postgres:password@localhost:5432/devcollab` to `.env`
4. Create the database in PostgreSQL: `createdb devcollab`
5. Create `src/config/db.js` — initialise and export the Knex instance
6. Write your first migration: `npx knex migrate:make create_users_table`
7. Fill in the migration with the `users` table schema:
   - `id` — uuid, primary key, default `gen_random_uuid()`
   - `email` — varchar(255), not null, unique
   - `password_hash` — varchar(255), not null
   - `full_name` — varchar(100), not null
   - `avatar_url` — varchar(500), nullable
   - `is_active` — boolean, default true
   - `created_at` / `updated_at` — timestamps, default now
8. Run `npx knex migrate:latest` and verify the table exists in psql
9. Write a second migration for `refresh_tokens` table (same approach)

**What to verify:** `\dt` in psql shows both tables. `npx knex migrate:status` shows both as "Ran".

---

### Day 3 — User registration

**Goal:** `POST /api/auth/register` validates input, hashes the password, saves the user, and returns the created user (without the password hash).

**Steps:**
1. Install validation and hashing libraries:
   ```
   npm install bcrypt zod
   ```
2. Create `src/modules/auth/auth.routes.js` and mount it in `app.js` under `/api/auth`
3. Create `src/modules/auth/auth.controller.js` — thin, only handles req/res
4. Create `src/modules/auth/auth.service.js` — all business logic lives here
5. In `auth.service.js`, write `registerUser(data)`:
   - Check if email already exists (query users table)
   - Hash the password: `bcrypt.hash(password, 12)`
   - Insert the new user with Knex, return the row (exclude `password_hash`)
6. Write a Zod schema for registration input:
   ```js
   const registerSchema = z.object({
     email: z.string().email(),
     password: z.string().min(8),
     full_name: z.string().min(2),
   });
   ```
7. Create `src/middleware/validate.js` — a middleware factory that takes a Zod schema and calls `next()` or returns a 400 with validation errors
8. Create `src/utils/response.js` — helper functions `sendSuccess(res, data, status)` and `sendError(res, message, status)`
9. Wire up the route: `POST /register → validate(registerSchema) → controller → service`
10. Create a global error handler middleware in `src/middleware/errorHandler.js` and add it last in `app.js`

**What to verify:** Use Postman/Insomnia. Send valid data → 201 with user object. Send duplicate email → 409. Send invalid data → 400 with error details.

---

### Day 4 — Login + JWT access tokens

**Goal:** `POST /api/auth/login` returns an access token (short-lived) and a refresh token (long-lived). Refresh token is saved to the database.

**Steps:**
1. Install JWT library:
   ```
   npm install jsonwebtoken
   ```
2. Add to `.env`:
   ```
   JWT_ACCESS_SECRET=your_long_random_secret_here
   JWT_REFRESH_SECRET=another_long_random_secret
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   ```
3. Create `src/utils/jwt.js` with two functions:
   - `generateAccessToken(payload)` — signs with access secret, 15m expiry
   - `generateRefreshToken(payload)` — signs with refresh secret, 7d expiry
4. In `auth.service.js`, write `loginUser(email, password)`:
   - Find user by email (return 401 if not found — never say "email not found", always "invalid credentials")
   - Compare password with bcrypt.compare
   - Generate both tokens
   - Save the refresh token to the `refresh_tokens` table with `expires_at = now + 7 days`
   - Return `{ accessToken, refreshToken, user }`
5. Write the login Zod schema (email + password only)
6. Wire up `POST /login` route

**What to verify:** Login with correct credentials returns both tokens. Login with wrong password returns 401. Check the `refresh_tokens` table in psql — the token row should appear.

---

### Day 5 — Auth middleware + refresh + logout

**Goal:** Protected routes work. Refresh token endpoint issues a new access token. Logout revokes the refresh token.

**Steps:**
1. Create `src/middleware/auth.js`:
   - Extract Bearer token from `Authorization` header
   - Verify with `jwt.verify` using the access secret
   - Attach `req.user = decoded payload` and call `next()`
   - Return 401 if token is missing, expired, or invalid
2. Test it by adding `auth` middleware to a dummy `GET /api/users/me` route
3. Write `POST /api/auth/refresh`:
   - Get refresh token from request body
   - Verify the JWT signature
   - Look it up in `refresh_tokens` table — check it exists, is not revoked, and has not expired
   - Issue a new access token
   - (Optional) Rotate: revoke old refresh token, issue a new one
4. Write `POST /api/auth/logout`:
   - Get refresh token from request body
   - Set `revoked = true` on that row in the database
   - Return 204 No Content
5. Add `GET /api/auth/me` (protected) — returns the logged-in user's profile from the DB

**What to verify:** Call a protected route without a token → 401. With a valid token → 200. After logout, try to refresh → 401.

---

### Day 6 — Seed data + Postman collection

**Goal:** Realistic seed data for development. A saved Postman collection so you never retype these requests again.

**Steps:**
1. Create `src/database/seeds/01_users.js` — insert 3–5 test users with hashed passwords
   ```js
   const bcrypt = require('bcrypt');
   exports.seed = async function(knex) {
     await knex('users').del();
     const hash = await bcrypt.hash('Password123!', 12);
     await knex('users').insert([
       { email: 'alice@test.com', password_hash: hash, full_name: 'Alice Smith' },
       { email: 'bob@test.com',   password_hash: hash, full_name: 'Bob Jones' },
     ]);
   };
   ```
2. Run `npx knex seed:run`
3. In Postman, create a collection "DevCollab API" with a folder "Auth"
4. Save requests for: register, login, refresh, logout, get me
5. Set a collection variable `{{base_url}} = http://localhost:3000/api`
6. In the login request's "Tests" tab, auto-save the token:
   ```js
   const res = pm.response.json();
   pm.collectionVariables.set("access_token", res.accessToken);
   ```
7. Use `{{access_token}}` in the Authorization header of protected requests

**What to verify:** Run the entire Auth folder in Postman with "Run collection". All requests pass.

---

### Week 1 checklist
- [ ] Express server running with structured folders
- [ ] PostgreSQL connected, migrations for `users` and `refresh_tokens`
- [ ] `POST /register` with validation and bcrypt hashing
- [ ] `POST /login` returns access + refresh tokens
- [ ] `POST /refresh` issues new access token
- [ ] `POST /logout` revokes refresh token
- [ ] `auth` middleware protects routes
- [ ] Seed data + Postman collection saved

---
---

## Week 2 — Projects & Tasks (CRUD + RBAC + Transactions)

### What you will build
Full CRUD for projects and tasks, role-based access control enforced per-project, file uploads attached to tasks, and your first database transaction (task creation + activity log in one atomic operation).

---

### Day 1 — Projects migrations & seed

**Steps:**
1. Create two migrations:
   - `create_projects_table` — id, owner_id (FK users), name, description, status (`active`/`archived`), timestamps
   - `create_project_members_table` — id, project_id (FK), user_id (FK), role (`admin`/`member`/`viewer`), joined_at. Add a unique constraint on `(project_id, user_id)`
2. Run migrations
3. Write `src/modules/projects/project.model.js` — a set of plain functions that run Knex queries (find by id, find by user, create, update, delete). No business logic here — just DB queries.
4. Add seeds: create 2 projects, add Alice as admin and Bob as member to project 1

---

### Day 2 — Project CRUD routes

**Steps:**
1. Create `projects.routes.js`, `projects.controller.js`, `projects.service.js`
2. Mount at `/api/projects` in `app.js`. All routes require the `auth` middleware.
3. Implement:
   - `POST /api/projects` — create project, auto-insert creator as `admin` in `project_members`
   - `GET /api/projects` — list only projects the logged-in user is a member of
   - `GET /api/projects/:id` — get single project (must be a member)
   - `PATCH /api/projects/:id` — update name/description (only `admin` role)
   - `DELETE /api/projects/:id` — soft-delete by setting status to `archived` (only `admin`)
4. Create `src/middleware/projectAccess.js` — a middleware factory:
   ```js
   // requireProjectRole('admin') or requireProjectRole('admin', 'member')
   const requireProjectRole = (...roles) => async (req, res, next) => {
     const membership = await findMembership(req.params.id, req.user.id);
     if (!membership || !roles.includes(membership.role)) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     req.membership = membership;
     next();
   };
   ```
5. Apply it to PATCH and DELETE: `requireProjectRole('admin')`

---

### Day 3 — Tasks migrations & basic CRUD

**Steps:**
1. Create the `tasks` migration:
   - id, project_id (FK), created_by (FK users), assigned_to (FK users, nullable)
   - title (varchar 255), description (text, nullable)
   - status: `varchar` with check constraint: `('todo', 'in_progress', 'in_review', 'done')`
   - priority: `varchar` with check constraint: `('low', 'medium', 'high', 'urgent')`
   - due_date (timestamp, nullable), timestamps
2. Create `task_activity_logs` migration:
   - id, task_id (FK), user_id (FK), action (varchar), old_value (jsonb, nullable), new_value (jsonb, nullable), created_at
3. Implement basic task CRUD under `/api/projects/:projectId/tasks`:
   - `POST /` — create task (members and admins only)
   - `GET /` — list tasks for the project
   - `GET /:taskId` — get single task
   - `PATCH /:taskId` — update task fields
   - `DELETE /:taskId` — delete task (admin only)

---

### Day 4 — Database transactions

**Goal:** When a task is created or its status/assignee changes, you insert an activity log row in the **same transaction** — either both succeed or both are rolled back.

**Steps:**
1. In `tasks.service.js`, refactor `createTask` to use a transaction:
   ```js
   const createTask = async (projectId, userId, data) => {
     return db.transaction(async (trx) => {
       const [task] = await trx('tasks').insert({ ...data, project_id: projectId, created_by: userId }).returning('*');
       await trx('task_activity_logs').insert({
         task_id: task.id,
         user_id: userId,
         action: 'task_created',
         new_value: JSON.stringify(task),
       });
       return task;
     });
   };
   ```
2. Do the same for `updateTask` — log which fields changed:
   ```js
   // Before update, fetch the current task
   // After update, compare old vs new and write the diff to old_value / new_value
   ```
3. To prove it works: temporarily throw an error inside the transaction after the task insert but before the log insert. Verify that no task row appears in the DB.

---

### Day 5 — Filtering, sorting, pagination

**Goal:** `GET /api/projects/:id/tasks` supports query parameters so the frontend can filter and paginate without loading everything.

**Steps:**
1. Support these query params:
   - `status=todo` — filter by status
   - `priority=high` — filter by priority
   - `assigned_to=<uuid>` — filter by assignee
   - `sort=due_date` or `sort=created_at` (default: `created_at`)
   - `order=asc` or `order=desc` (default: `desc`)
   - `page=1` and `limit=20` (default values)
2. Implementation pattern in `task.model.js`:
   ```js
   const listTasks = async (projectId, filters) => {
     const { status, priority, assigned_to, sort = 'created_at', order = 'desc', page = 1, limit = 20 } = filters;
     let query = db('tasks').where({ project_id: projectId });
     if (status)      query = query.where({ status });
     if (priority)    query = query.where({ priority });
     if (assigned_to) query = query.where({ assigned_to });
     const offset = (page - 1) * limit;
     const [{ count }] = await db('tasks').where({ project_id: projectId }).count('id');
     const data = await query.orderBy(sort, order).limit(limit).offset(offset);
     return { data, total: parseInt(count), page, limit, pages: Math.ceil(count / limit) };
   };
   ```
3. Add indexes to the `tasks` table in a new migration:
   ```js
   table.index(['project_id']);
   table.index(['assigned_to']);
   table.index(['status']);
   ```

---

### Day 6 — File attachments (multer)

**Steps:**
1. Install multer:
   ```
   npm install multer
   ```
2. Create `src/config/multer.js`:
   ```js
   const multer = require('multer');
   const path = require('path');
   const storage = multer.diskStorage({
     destination: 'uploads/',
     filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
   });
   const fileFilter = (req, file, cb) => {
     const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt'];
     const ext = path.extname(file.originalname).toLowerCase();
     cb(null, allowed.includes(ext));
   };
   module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
   ```
3. Create the `task_attachments` migration (if not done yet)
4. Add route `POST /api/tasks/:taskId/attachments`:
   - Use `upload.single('file')` middleware
   - Save file metadata to `task_attachments` table
   - Return the attachment record
5. Add route `GET /api/tasks/:taskId/attachments` — list attachments for a task
6. Serve uploaded files statically: `app.use('/uploads', express.static('uploads'))`
7. Add `uploads/` to `.gitignore`

---

### Week 2 checklist
- [ ] Migrations for projects, project_members, tasks, task_activity_logs, task_attachments
- [ ] Full project CRUD with RBAC (admin-only operations protected)
- [ ] Full task CRUD nested under projects
- [ ] Transactions: task create/update + activity log are atomic
- [ ] Pagination, filtering, and sorting on task list
- [ ] File upload attached to tasks (multer)
- [ ] Indexes added on FK columns

---
---

## Week 3 — Real-time with Socket.io

### What you will build
Live task board updates, a per-project team chat, online presence (who's in the room), and typing indicators — all powered by Socket.io integrated into your existing Express server.

---

### Day 1 — Socket.io server setup

**Steps:**
1. Install Socket.io:
   ```
   npm install socket.io
   ```
2. Refactor `index.js` to share the HTTP server:
   ```js
   const http = require('http');
   const { Server } = require('socket.io');
   const app = require('./src/app');

   const server = http.createServer(app);
   const io = new Server(server, {
     cors: { origin: process.env.CLIENT_URL, credentials: true }
   });

   require('./src/socket')(io);  // socket logic in its own module
   server.listen(process.env.PORT);
   ```
3. Create `src/socket/index.js`:
   ```js
   module.exports = (io) => {
     io.on('connection', (socket) => {
       console.log('connected:', socket.id);
       socket.on('disconnect', () => console.log('disconnected:', socket.id));
     });
   };
   ```
4. Test with a simple HTML page or a socket.io client script in your browser console:
   ```js
   const socket = io('http://localhost:3000');
   socket.on('connect', () => console.log('connected!', socket.id));
   ```

---

### Day 2 — JWT auth for sockets

**Goal:** Only authenticated users can connect. Unauthenticated connections are rejected before they can emit any events.

**Steps:**
1. Install the socket.io middleware helper (optional — you can write it manually):
   ```
   npm install socketio-jwt  # optional, or write manually
   ```
2. Create `src/socket/middleware/socketAuth.js`:
   ```js
   const { verifyAccessToken } = require('../../utils/jwt');
   module.exports = (socket, next) => {
     const token = socket.handshake.auth.token;
     if (!token) return next(new Error('Authentication error'));
     try {
       socket.user = verifyAccessToken(token);
       next();
     } catch {
       next(new Error('Authentication error'));
     }
   };
   ```
3. Register it in `src/socket/index.js`:
   ```js
   io.use(socketAuth);
   ```
4. On the client side, send the token in the handshake:
   ```js
   const socket = io('http://localhost:3000', {
     auth: { token: localStorage.getItem('accessToken') }
   });
   ```
5. Test: connect without a token → rejected. With a valid token → connected, `socket.user` is populated.

---

### Day 3 — Project rooms

**Goal:** When a user opens a project page, they join that project's socket room. When they leave, they leave the room. This scopes all events to only the relevant users.

**Steps:**
1. Add event handlers in `src/socket/index.js`:
   ```js
   socket.on('project:join', async (projectId) => {
     // verify user is actually a member of this project
     const membership = await findMembership(projectId, socket.user.id);
     if (!membership) return socket.emit('error', 'Not a member');
     socket.join(`project:${projectId}`);
     socket.to(`project:${projectId}`).emit('user:joined', { userId: socket.user.id });
   });

   socket.on('project:leave', (projectId) => {
     socket.leave(`project:${projectId}`);
     socket.to(`project:${projectId}`).emit('user:left', { userId: socket.user.id });
   });
   ```
2. Make the `io` instance accessible in your REST controllers. The cleanest way is to attach it to `app`:
   ```js
   // in index.js, after creating io:
   app.set('io', io);
   // in any controller:
   const io = req.app.get('io');
   ```

---

### Day 4 — Live task board

**Goal:** When any REST API action changes a task (create, update, delete), the Socket.io server broadcasts it to everyone in that project's room — so every connected browser updates without a page refresh.

**Steps:**
1. In `tasks.controller.js`, after a successful task create/update/delete, emit an event:
   ```js
   // After creating a task:
   const io = req.app.get('io');
   io.to(`project:${projectId}`).emit('task:created', task);

   // After updating:
   io.to(`project:${projectId}`).emit('task:updated', task);

   // After deleting:
   io.to(`project:${projectId}`).emit('task:deleted', { taskId });
   ```
2. Emit events for all three operations (created, updated, deleted)
3. On the frontend (or in a test socket client), listen for these events and log them to the console to verify they fire correctly
4. Also emit a `task:updated` event when a task is moved between status columns (this is the core of the live kanban board)

---

### Day 5 — Team chat

**Goal:** Users in a project room can send and receive messages in real time. Messages are persisted to the database so they survive a page refresh.

**Steps:**
1. Create the `messages` migration (if not done):
   - id, project_id (FK), sender_id (FK users), content (text), is_edited (boolean, default false), timestamps
2. Add `message:send` handler in the socket module:
   ```js
   socket.on('message:send', async ({ projectId, content }) => {
     const membership = await findMembership(projectId, socket.user.id);
     if (!membership) return;
     const [message] = await db('messages')
       .insert({ project_id: projectId, sender_id: socket.user.id, content })
       .returning('*');
     // Broadcast to everyone in the room INCLUDING the sender
     io.to(`project:${projectId}`).emit('message:new', message);
   });
   ```
3. Add a REST endpoint `GET /api/projects/:id/messages` to load the message history when a user first opens the chat (paginated, newest last)
4. Test: open two browser tabs, join the same project, send a message from tab 1 — it should appear in tab 2 instantly

---

### Day 6 — Online presence + typing indicator

**Steps:**
1. **Online presence** — track which users are currently in each project room:
   ```js
   // When a user joins a room, add them to an in-memory Map
   const roomPresence = new Map(); // projectId → Set of userIds

   socket.on('project:join', (projectId) => {
     if (!roomPresence.has(projectId)) roomPresence.set(projectId, new Set());
     roomPresence.get(projectId).add(socket.user.id);
     // Tell everyone in the room who is currently online
     io.to(`project:${projectId}`).emit('presence:update', {
       online: [...roomPresence.get(projectId)]
     });
   });

   socket.on('disconnect', () => {
     // Remove from all rooms they were in
     roomPresence.forEach((users, projectId) => {
       if (users.delete(socket.user.id)) {
         io.to(`project:${projectId}`).emit('presence:update', {
           online: [...users]
         });
       }
     });
   });
   ```
2. **Typing indicator:**
   ```js
   socket.on('typing:start', ({ projectId }) => {
     socket.to(`project:${projectId}`).emit('typing:start', { userId: socket.user.id });
   });
   socket.on('typing:stop', ({ projectId }) => {
     socket.to(`project:${projectId}`).emit('typing:stop', { userId: socket.user.id });
   });
   ```
3. On the client side, emit `typing:start` when the user starts typing and `typing:stop` after a 1-second debounce of no keystrokes

---

### Week 3 checklist
- [ ] Socket.io server integrated with Express HTTP server
- [ ] JWT authentication middleware for socket connections
- [ ] `project:join` / `project:leave` room management
- [ ] `task:created`, `task:updated`, `task:deleted` events broadcast from REST handlers
- [ ] Real-time team chat with DB persistence
- [ ] Online presence tracking per room
- [ ] Typing indicator events

---
---

## Week 4 — Redis & Caching

### What you will build
A Redis layer that caches expensive DB reads, a rate limiter that stops brute-force attacks on the auth endpoints, and migration of refresh tokens from PostgreSQL to Redis.

---

### Day 1 — Redis setup

**Steps:**
1. Start Redis (if you haven't added Docker yet, just install it locally or use Docker for Redis only):
   ```bash
   docker run -d -p 6379:6379 --name devcollab-redis redis:alpine
   ```
2. Install the Redis client:
   ```
   npm install ioredis
   ```
3. Create `src/config/redis.js`:
   ```js
   const Redis = require('ioredis');
   const redis = new Redis(process.env.REDIS_URL);
   redis.on('connect', () => console.log('Redis connected'));
   redis.on('error', (err) => console.error('Redis error:', err));
   module.exports = redis;
   ```
4. Add `REDIS_URL=redis://localhost:6379` to `.env`
5. Test in a scratch file: `await redis.set('hello', 'world'); console.log(await redis.get('hello'));`

---

### Day 2 — Cache-aside pattern for projects

**Goal:** The first request for a project hits the DB. Subsequent requests are served from Redis until the cache is invalidated.

**Steps:**
1. In `projects.service.js`, wrap `getProjectById` with cache logic:
   ```js
   const getProjectById = async (projectId) => {
     const cacheKey = `project:${projectId}`;
     const cached = await redis.get(cacheKey);
     if (cached) return JSON.parse(cached);

     const project = await projectModel.findById(projectId);
     if (project) await redis.setex(cacheKey, 300, JSON.stringify(project)); // 5 min TTL
     return project;
   };
   ```
2. In `updateProject` and `deleteProject`, invalidate the cache:
   ```js
   await redis.del(`project:${projectId}`);
   ```
3. Add a helper `src/utils/cache.js` with `getOrSet(key, ttl, fetchFn)` to avoid repeating this pattern everywhere:
   ```js
   const getOrSet = async (key, ttl, fetchFn) => {
     const cached = await redis.get(key);
     if (cached) return JSON.parse(cached);
     const data = await fetchFn();
     if (data) await redis.setex(key, ttl, JSON.stringify(data));
     return data;
   };
   ```

---

### Day 3 — Cache task lists

**Goal:** Cache paginated task list responses, but use a smart invalidation strategy so you don't serve stale data.

**Steps:**
1. The challenge with list caches is that the key depends on all the query params. Use a composite key:
   ```js
   const cacheKey = `tasks:${projectId}:${JSON.stringify(filters)}`;
   ```
2. The problem: when a task is created/updated/deleted, you can't easily know which cached pages to invalidate. Solution — use a version key:
   ```js
   // Get the current version for this project's task list
   const version = await redis.get(`tasks:${projectId}:version`) || 1;
   const cacheKey = `tasks:${projectId}:v${version}:${JSON.stringify(filters)}`;

   // On any task mutation, increment the version
   await redis.incr(`tasks:${projectId}:version`);
   // All old cache keys are now unreachable (they'll expire naturally via TTL)
   ```
3. Apply this pattern in `tasks.service.js` for list queries (TTL: 60 seconds is enough for task lists)

---

### Day 4 — Rate limiting with Redis

**Goal:** Protect `/api/auth/login` and `/api/auth/register` from brute-force and spam attacks.

**Steps:**
1. Install:
   ```
   npm install express-rate-limit rate-limit-redis
   ```
2. Create `src/middleware/rateLimiter.js`:
   ```js
   const rateLimit = require('express-rate-limit');
   const RedisStore = require('rate-limit-redis');
   const redis = require('../config/redis');

   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     max: 10,                    // 10 attempts per window
     standardHeaders: true,
     message: { error: 'Too many attempts. Try again in 15 minutes.' },
     store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
   });

   const apiLimiter = rateLimit({
     windowMs: 60 * 1000,
     max: 100,
     store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
   });

   module.exports = { authLimiter, apiLimiter };
   ```
3. Apply `authLimiter` to `/api/auth/login` and `/api/auth/register`
4. Apply `apiLimiter` globally in `app.js` for all `/api` routes

**Test it:** Send 11 rapid login requests in a row. The 11th should return 429 Too Many Requests.

---

### Day 5 — Move refresh tokens to Redis

**Goal:** Refresh tokens don't need to be in PostgreSQL. Redis is faster and handles TTL natively — no manual cleanup job needed.

**Steps:**
1. In `auth.service.js`, replace the Knex insert with a Redis call:
   ```js
   // On login — store refresh token with 7-day TTL
   const key = `refresh:${userId}:${refreshToken}`;
   await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify({ userId }));
   ```
2. To support multiple sessions (e.g. phone + laptop), use a set:
   ```js
   // Store token in a set keyed by userId, with a separate expiry key per token
   await redis.setex(`refresh:${refreshToken}`, 7 * 24 * 60 * 60, userId);
   ```
3. Update `POST /auth/refresh` to check Redis instead of Postgres:
   ```js
   const userId = await redis.get(`refresh:${incomingToken}`);
   if (!userId) return res.status(401).json({ error: 'Invalid refresh token' });
   ```
4. Update `POST /auth/logout` to delete from Redis:
   ```js
   await redis.del(`refresh:${incomingToken}`);
   ```
5. Drop the `refresh_tokens` Postgres table with a new migration (or keep it for history — your call)

---

### Day 6 — Review & cache logging

**Steps:**
1. Add a simple cache hit/miss counter. In `src/utils/cache.js`, log each hit and miss:
   ```js
   console.log(`[cache] ${cached ? 'HIT' : 'MISS'} — ${key}`);
   ```
2. Run your app, hit various endpoints, and observe the logs. You should see MISS on the first call, HIT on subsequent calls, then MISS again after an update.
3. Think through: what *should* be cached vs what shouldn't?
   - Good candidates: single project/task reads, user profiles
   - Bad candidates: messages (always fresh), notifications (user-specific real-time data)
4. Review your TTL choices — 5 minutes for project data is reasonable; task lists might be fine at 30 seconds

---

### Week 4 checklist
- [ ] Redis running and connected
- [ ] Cache-aside pattern for `getProjectById`
- [ ] Version-based cache invalidation for task lists
- [ ] Rate limiting on auth endpoints (backed by Redis)
- [ ] Refresh tokens stored and verified via Redis (not Postgres)
- [ ] Cache hit/miss logging visible

---
---

## Week 5 — Message Broker (RabbitMQ)

### What you will build
An email notification system using RabbitMQ as the message broker. When a task is assigned to someone, a message is published to a queue. A separate worker process consumes that queue and sends the email. Failed messages go to a dead-letter queue for retry.

---

### Day 1 — RabbitMQ setup

**Steps:**
1. Start RabbitMQ with the management plugin:
   ```bash
   docker run -d --name devcollab-rabbitmq \
     -p 5672:5672 -p 15672:15672 \
     rabbitmq:3-management
   ```
2. Open the management UI at `http://localhost:15672` (default: guest/guest)
3. Install the AMQP client:
   ```
   npm install amqplib
   ```
4. Create `src/config/rabbitmq.js`:
   ```js
   const amqp = require('amqplib');
   let connection, channel;

   const connect = async () => {
     connection = await amqp.connect(process.env.RABBITMQ_URL);
     channel = await connection.createChannel();
     console.log('RabbitMQ connected');
     return channel;
   };

   const getChannel = () => channel;
   module.exports = { connect, getChannel };
   ```
5. Add `RABBITMQ_URL=amqp://guest:guest@localhost:5672` to `.env`
6. Call `connect()` in `index.js` at startup (alongside DB connect)

---

### Day 2 — Publish task-assigned events

**Goal:** When a task is assigned (created with `assigned_to`, or updated to have a new `assigned_to`), publish a message to a RabbitMQ exchange.

**Steps:**
1. Create `src/queues/setup.js` — declare your exchange and queues on startup:
   ```js
   const setupQueues = async (channel) => {
     // Declare a dead-letter exchange first
     await channel.assertExchange('dlx', 'direct', { durable: true });
     await channel.assertQueue('dlq.notifications', { durable: true });
     await channel.bindQueue('dlq.notifications', 'dlx', 'notifications');

     // Main exchange and queue
     await channel.assertExchange('notifications', 'direct', { durable: true });
     await channel.assertQueue('q.email.notifications', {
       durable: true,
       arguments: {
         'x-dead-letter-exchange': 'dlx',
         'x-dead-letter-routing-key': 'notifications',
       }
     });
     await channel.bindQueue('q.email.notifications', 'notifications', 'email');
   };
   module.exports = setupQueues;
   ```
2. Create `src/queues/publishers/notificationPublisher.js`:
   ```js
   const { getChannel } = require('../../config/rabbitmq');

   const publishTaskAssigned = (payload) => {
     const channel = getChannel();
     const message = Buffer.from(JSON.stringify(payload));
     channel.publish('notifications', 'email', message, { persistent: true });
     console.log('[MQ] Published task:assigned for', payload.assigneeEmail);
   };

   module.exports = { publishTaskAssigned };
   ```
3. In `tasks.service.js`, after a task is assigned, call `publishTaskAssigned`:
   ```js
   if (data.assigned_to) {
     const assignee = await getUserById(data.assigned_to);
     publishTaskAssigned({
       type: 'task_assigned',
       assigneeEmail: assignee.email,
       assigneeName: assignee.full_name,
       taskTitle: task.title,
       projectName: project.name,
       taskId: task.id,
     });
   }
   ```

---

### Day 3 — Email worker

**Goal:** A separate Node.js process (the "worker") that runs independently of your API server. It consumes the queue and sends emails.

**Steps:**
1. Install Nodemailer:
   ```
   npm install nodemailer
   ```
2. Create `src/workers/emailWorker.js`:
   ```js
   require('dotenv').config();
   const amqp = require('amqplib');
   const nodemailer = require('nodemailer');

   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: 587,
     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
   });

   const processMessage = async (msg, channel) => {
     const payload = JSON.parse(msg.content.toString());
     console.log('[Worker] Processing:', payload.type);

     try {
       await transporter.sendMail({
         from: '"DevCollab" <no-reply@devcollab.app>',
         to: payload.assigneeEmail,
         subject: `You've been assigned: ${payload.taskTitle}`,
         html: `<p>Hi ${payload.assigneeName},</p>
                <p>You have been assigned the task <strong>${payload.taskTitle}</strong> in project <strong>${payload.projectName}</strong>.</p>`,
       });
       channel.ack(msg);  // ← ALWAYS ack after successful processing
       console.log('[Worker] Email sent to', payload.assigneeEmail);
     } catch (err) {
       console.error('[Worker] Failed:', err.message);
       channel.nack(msg, false, false);  // ← nack, don't requeue → goes to DLQ
     }
   };

   const start = async () => {
     const conn = await amqp.connect(process.env.RABBITMQ_URL);
     const channel = await conn.createChannel();
     channel.prefetch(1);  // process one message at a time
     channel.consume('q.email.notifications', (msg) => processMessage(msg, channel));
     console.log('[Worker] Listening for messages...');
   };

   start().catch(console.error);
   ```
3. Add to `package.json` scripts:
   ```json
   "worker": "node src/workers/emailWorker.js"
   ```
4. For development, use [Mailtrap](https://mailtrap.io) (free) as your SMTP — it catches all emails without actually sending them. Add the credentials to `.env`.
5. Run the worker in a separate terminal: `npm run worker`
6. Assign a task via the API and watch the worker terminal — you should see the email processed

---

### Day 4 — Dead-letter queue

**Goal:** Understand what happens to messages that fail processing. The DLQ ensures no message is silently lost.

**Steps:**
1. In the management UI, you should see `dlq.notifications` queue after running the setup
2. Test the DLQ by intentionally causing a failure:
   ```js
   // Temporarily in processMessage, throw before sending:
   throw new Error('Simulated failure');
   ```
3. Assign a task — the worker processes it, throws, nacks it, and it moves to `dlq.notifications`
4. Verify in the management UI: the message appears in the DLQ
5. Write a simple DLQ consumer script `src/workers/dlqWorker.js` that reads from the DLQ and logs the failed messages (you could also re-publish them to retry):
   ```js
   channel.consume('dlq.notifications', (msg) => {
     const payload = JSON.parse(msg.content.toString());
     console.error('[DLQ] Failed message:', payload);
     // Could re-publish, save to DB for manual review, send alert, etc.
     channel.ack(msg);
   });
   ```
6. Remove the simulated failure and restore normal processing

---

### Day 5 — More event types

**Steps:**
1. Add a `project_invite` notification:
   - When a user is added to `project_members`, publish an event
   - Worker sends them a welcome email: "You've been added to project X"
2. Add a `task_due_soon` notification:
   - Write a scheduled job using `node-cron`:
     ```
     npm install node-cron
     ```
   - Every hour, query tasks where `due_date` is within 24 hours and `assigned_to` is not null
   - Publish a `task_due_soon` event for each
   - Worker sends a reminder email
3. In the worker, handle different `type` values with a switch statement:
   ```js
   switch (payload.type) {
     case 'task_assigned':    return sendTaskAssignedEmail(payload);
     case 'project_invite':   return sendProjectInviteEmail(payload);
     case 'task_due_soon':    return sendDueSoonEmail(payload);
   }
   ```

---

### Day 6 — Durable queues & acknowledgements deep dive

**Steps:**
1. Stop RabbitMQ with `docker stop devcollab-rabbitmq`
2. Publish a message via the API (assign a task)
3. Start RabbitMQ again: `docker start devcollab-rabbitmq`
4. Verify the message is still there waiting in the queue (because it's `durable: true` and `persistent: true`)
5. Start the worker — it processes the surviving message
6. Understand the three `ack` strategies:
   - `channel.ack(msg)` — message processed successfully, remove from queue
   - `channel.nack(msg, false, true)` — failed, put back at the end of the queue (be careful: can cause infinite loops)
   - `channel.nack(msg, false, false)` — failed, discard (goes to DLQ if configured)
7. Add a `retry_count` field to your messages and implement max 3 retries before sending to DLQ

---

### Week 5 checklist
- [ ] RabbitMQ running with management UI accessible
- [ ] Exchange and queue declared with dead-letter configuration
- [ ] `publishTaskAssigned` called from tasks service
- [ ] Email worker running as a separate process
- [ ] Emails received in Mailtrap on task assignment
- [ ] DLQ receives failed messages
- [ ] `task_due_soon` cron job publishing events
- [ ] Messages survive broker restart (durable + persistent)

---
---

## Week 6 — Docker & Deployment

### What you will build
Containerise the entire application — API, PostgreSQL, Redis, RabbitMQ, and the email worker — using Docker and Docker Compose. Add Nginx as a reverse proxy. The whole stack starts with a single `docker-compose up` command.

---

### Day 1 — Dockerfile for the API

**Steps:**
1. Create `Dockerfile` at the project root:
   ```dockerfile
   FROM node:20-alpine AS base
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["node", "index.js"]
   ```
2. Create `.dockerignore`:
   ```
   node_modules
   npm-debug.log
   .env
   uploads/
   .git
   ```
3. Build and run manually to test:
   ```bash
   docker build -t devcollab-api .
   docker run -p 3000:3000 --env-file .env devcollab-api
   ```
4. Verify the API responds correctly inside the container

**Multi-stage build (optional but good practice):**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.js ./
COPY --from=builder /app/knexfile.js ./
EXPOSE 3000
CMD ["node", "index.js"]
```

---

### Day 2 — Docker Compose

**Goal:** One file that starts every service and wires them together on an internal network.

**Steps:**
1. Create `docker-compose.yml`:
   ```yaml
   version: '3.9'
   services:
     api:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://postgres:secret@db:5432/devcollab
         - REDIS_URL=redis://redis:6379
         - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
       depends_on:
         db:
           condition: service_healthy
         redis:
           condition: service_started
         rabbitmq:
           condition: service_healthy
       volumes:
         - ./uploads:/app/uploads

     worker:
       build: .
       command: node src/workers/emailWorker.js
       environment:
         - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
       depends_on:
         rabbitmq:
           condition: service_healthy

     db:
       image: postgres:16-alpine
       environment:
         POSTGRES_DB: devcollab
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: secret
       volumes:
         - pgdata:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U postgres"]
         interval: 5s
         timeout: 5s
         retries: 5

     redis:
       image: redis:7-alpine
       volumes:
         - redisdata:/data

     rabbitmq:
       image: rabbitmq:3-management-alpine
       ports:
         - "15672:15672"
       healthcheck:
         test: ["CMD", "rabbitmq-diagnostics", "ping"]
         interval: 10s
         timeout: 5s
         retries: 5

   volumes:
     pgdata:
     redisdata:
   ```
2. Run `docker-compose up --build` and watch all services start
3. Check `docker-compose ps` — all services should be "Up"

---

### Day 3 — Health checks & startup order

**Goal:** The API should not start accepting requests until Postgres is ready and migrations have run.

**Steps:**
1. Create a migration runner script `scripts/migrate.sh`:
   ```bash
   #!/bin/sh
   echo "Running migrations..."
   npx knex migrate:latest
   echo "Migrations complete."
   ```
2. Update the `api` service command in docker-compose to run migrations first:
   ```yaml
   command: sh -c "npx knex migrate:latest && node index.js"
   ```
3. Add a health check to the API service itself:
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
     interval: 10s
     timeout: 5s
     retries: 3
   ```
4. Test that tearing down the DB and restarting the whole stack works cleanly:
   ```bash
   docker-compose down -v   # removes volumes too
   docker-compose up --build
   ```
   The API should wait for Postgres, run migrations, then start.

---

### Day 4 — Nginx reverse proxy

**Goal:** Nginx sits in front of your API and serves as the entry point. This is how real production deployments work — you never expose Node.js directly to the internet.

**Steps:**
1. Create `nginx/nginx.conf`:
   ```nginx
   events {}
   http {
     upstream api {
       server api:3000;
     }

     server {
       listen 80;
       client_max_body_size 10M;

       location /api {
         proxy_pass http://api;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection 'upgrade';
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_cache_bypass $http_upgrade;
       }

       location /socket.io {
         proxy_pass http://api;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection "upgrade";
       }

       location /uploads {
         proxy_pass http://api;
       }
     }
   }
   ```
2. Add the Nginx service to `docker-compose.yml`:
   ```yaml
   nginx:
     image: nginx:alpine
     ports:
       - "80:80"
     volumes:
       - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
     depends_on:
       - api
   ```
3. Remove the `ports` mapping from the `api` service (it no longer needs to be directly exposed):
   ```yaml
   # api service — remove or comment out:
   # ports:
   #   - "3000:3000"
   ```
4. Test: all API calls now go through `http://localhost/api/...` instead of `:3000`
5. Verify Socket.io still works through Nginx (the upgrade headers are the critical part)

---

### Day 5 — Environment config hardening

**Steps:**
1. Create `.env.production` (do NOT commit this — add to `.gitignore`):
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   RABBITMQ_URL=amqp://...
   JWT_ACCESS_SECRET=<long random string>
   JWT_REFRESH_SECRET=<long random string>
   ```
2. Generate secure secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. Create `src/config/env.js` — validate required env vars at startup:
   ```js
   const required = ['DATABASE_URL', 'REDIS_URL', 'RABBITMQ_URL', 'JWT_ACCESS_SECRET'];
   required.forEach(key => {
     if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
   });
   ```
4. Import this file at the very top of `index.js` — the app crashes immediately on startup if any var is missing rather than failing mysteriously later
5. Use Docker secrets or environment variable injection in production rather than `.env` files

---

### Day 6 — Full integration test

**Goal:** Start from absolutely nothing and verify that every single feature works end-to-end inside Docker.

**Steps:**
1. Tear everything down: `docker-compose down -v`
2. Remove all built images: `docker-compose rm -f`
3. Rebuild and start: `docker-compose up --build`
4. Watch the logs — check each service starts cleanly and in order
5. Run through this checklist manually using Postman:
   - Register a user → login → get access token
   - Create a project → invite a second user as a member
   - Create a task → assign it to the second user (check Mailtrap for the email)
   - Update the task status → verify Socket.io event fires
   - Send a chat message in the project
   - Check Redis is caching project reads (watch the logs)
   - Make 11 rapid login requests → verify rate limiting kicks in
6. Check `docker-compose logs worker` — email jobs should appear processed
7. Check `docker-compose logs api` — no unhandled errors
8. Open `http://localhost:15672` — RabbitMQ management. No messages stuck in the queue.

---

### Week 6 checklist
- [ ] `Dockerfile` with multi-stage build for the API
- [ ] `docker-compose.yml` with all 5 services (api, worker, db, redis, rabbitmq)
- [ ] Health checks on db and rabbitmq
- [ ] Migrations run automatically on API startup
- [ ] Nginx reverse proxy routing `/api` and `/socket.io`
- [ ] API no longer directly exposed — all traffic goes through Nginx
- [ ] Required env vars validated at startup
- [ ] Full end-to-end test from `docker-compose up` passes

---
---

## Final project review

Once all 6 weeks are done, your codebase demonstrates:

| Concept | Where it lives |
|---|---|
| REST API design | Every module's routes + controllers |
| Input validation | Zod schemas + validate middleware |
| Authentication | JWT access/refresh tokens, bcrypt |
| Authorization | RBAC via project_members.role |
| Database | PostgreSQL with Knex query builder |
| Migrations | `src/database/migrations/` |
| Transactions | Task creation + activity log |
| Indexing | FK indexes on tasks and project_members |
| Caching | Redis cache-aside with version invalidation |
| Rate limiting | Redis-backed express-rate-limit |
| Real-time | Socket.io rooms, events, presence |
| Message broker | RabbitMQ exchange → queue → worker |
| Background jobs | node-cron + email worker process |
| Dead-letter queue | Failed messages caught and inspected |
| File uploads | multer with type/size validation |
| Containerisation | Dockerfile + Docker Compose |
| Reverse proxy | Nginx proxying API and WebSocket |
| Config management | .env + startup validation |

**Suggested next steps after finishing:**
- Deploy to a cloud VPS (DigitalOcean, Hetzner) using the same Docker Compose setup
- Add end-to-end tests with Supertest
- Add a CI pipeline (GitHub Actions) that runs tests on every push
- Replace multer local storage with S3-compatible object storage (MinIO locally, AWS S3 in prod)
- Explore horizontal scaling: multiple API replicas behind Nginx, Redis adapter for Socket.io
