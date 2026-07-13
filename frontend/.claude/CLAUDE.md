# DevCollab — Frontend

Web client for the DevCollab collaborative project/task manager. **TanStack Start (React 19 meta-framework) on Vite, TypeScript, TanStack Router (file-based), TanStack React Query, Zustand, Axios, Socket.io client, Tailwind CSS v4 + shadcn/ui.** Talks to the [backend](../../backend) REST API + `/project` socket namespace.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port **3000** |
| `npm run build` | Build + type check |
| `npm run preview` | Preview production build |
| `npm start` | Run SSR server from `.output/server` |

## Directory map (`src/`)

| Path | Purpose |
| --- | --- |
| `routes/` | File-based routes (TanStack Router). Auto-generated tree in `routeTree.gen.ts` |
| `router.tsx` | Router creation with context (`auth`, `queryClient`) |
| `components/` | `auth/`, `layout/`, `project/`, `task/`, `providers/`, and `ui/` (shadcn) |
| `queries/` | React Query hooks (`use-auth`, `use-projects`, `use-tasks`) using the `queryOptions` pattern |
| `stores/` | Zustand stores (`auth.ts`, persisted to sessionStorage) |
| `lib/api/` | Axios client + per-domain wrappers (`client.ts`, `auth.ts`, `projects.ts`, `tasks.ts`, `users.ts`) |
| `lib/socket.ts` | Socket.io manager (per-project namespace pool) |
| `hooks/` | `use-debounce`, `use-mobile`, `use-project-socket` |
| `server/` | Server-only functions (`auth.ts`, `session.ts`) via `createServerFn`/`createMiddleware` |
| `types/` | Shared TS interfaces (`auth`, `common`, `project`, `task`) |
| `styles/` | Tailwind + theme CSS (`app.css`) |

**Path alias:** `~/*` → `src/*` (tsconfig).

## Routing

File-based via TanStack Router:
- `routes/__root.tsx` — root layout (QueryProvider, ThemeProvider, TooltipProvider).
- `routes/_auth.tsx` — public auth layout (`login`, `register`, `forgot-password`).
- `routes/_app.tsx` — protected layout (auth middleware + sidebar).
- Routes include `/`, `/dashboard`, `/profile`, `/projects`, `/projects/$projectId`.

## State & data fetching

- **Zustand** (`stores/auth.ts`): `user`, `accessToken`, `isAuthenticated`; persisted to sessionStorage; devtools enabled.
- **React Query**: hooks built on `queryOptions`; nested query keys (`projectKeys`, `taskKeys`, structured as `[domain, "list"|"detail", ...]`); mutations auto-invalidate on success; `useSuspenseQuery` for dependent data. Devtools: ReactQuery + TanStackRouter.

## Backend integration

**Axios client** (`lib/api/client.ts`) — isomorphic instance, `withCredentials: true` (cookie auth) with `Authorization: Bearer <accessToken>` also supported:
- Request interceptor forwards server-side headers (Cookie/Authorization/Referer/Origin) during SSR.
- Response interceptor handles **401 → auto refresh** via `POST /auth/refresh-token`, updates the auth store, and redirects to `/login` on failure.
- API wrappers use verb-style methods: `projectApi.getAll()`, `taskApi.getById()`, `projectApi.manageMember()`.

**Socket.io** (`lib/socket.ts`) — connects to namespace **`/project`** with a `projectId` query param (websocket + polling). `useProjectSocket(projectId)` listens and syncs the React Query cache:
- Server → client: `project:joined`, `task:created`, `task:updated`, `task:deleted`, `user:typing`, `user:typing-stop`, `presence:updated`.
- Client → server: `user:typing`, `user:typing-stop`.
- Per-`projectId` socket pool; auto-connect + cleanup on unmount.

## Styling

Tailwind CSS **v4** (inline theme in `styles/app.css`, oklch colors, light/dark via `.dark`; no `tailwind.config.ts`). shadcn/ui components in `components/ui/` built with `class-variance-authority` + `clsx` + `tailwind-merge`, Radix primitives, `lucide-react` icons, `recharts`. Forms via `react-hook-form` + `@hookform/resolvers`.

## Config & environment

`vite.config.ts` plugins: `tanstackStart`, `tailwindcss`, `viteReact`, `nitro`; dev port 3000. Env vars:
- `VITE_API_URL` — backend REST base (e.g. `http://localhost:8000/api/v1`).
- `VITE_SOCKET_URL` — socket server (e.g. `http://localhost:8000`).

⚠️ **Port mismatch to watch:** the backend defaults to `APP_PORT=8001` and only allows CORS origin `http://localhost:3000`. If the frontend `.env` points at `:8000`, align the `VITE_*` URLs with the backend's actual port (and ensure the backend CORS origin matches this app's origin).

## Conventions

- Files/folders kebab-case; React components PascalCase.
- shadcn `Button` variants via CVA (`variant`, `size`); `data-slot` attributes for CSS targeting; accessibility baked in (ARIA, focus-visible rings).
