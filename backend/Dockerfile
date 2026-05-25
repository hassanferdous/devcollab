FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_STORE_DIR="/pnpm/store"
ENV CI=true

RUN corepack enable && corepack prepare pnpm@latest --activate

# Write pnpm config directly to avoid CLI PATH issues
RUN mkdir -p /root/.config/pnpm && \
    echo "store-dir=/pnpm/store" >> /root/.config/pnpm/rc

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm approve-builds --all

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .

# ── Development ──────────────────────────────────────
FROM base AS development
CMD ["pnpm", "dev"]

# ── Production ───────────────────────────────────────
FROM base AS production

RUN pnpm build

CMD ["pnpm", "start"]