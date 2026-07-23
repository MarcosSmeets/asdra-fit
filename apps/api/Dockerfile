# Build de produção da API em monorepo pnpm.
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps + build ----
FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY .npmrc ./
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm --filter @ad-sidera/config build \
  && pnpm --filter @ad-sidera/shared build \
  && pnpm --filter @ad-sidera/api exec prisma generate \
  && pnpm --filter @ad-sidera/api build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api
EXPOSE 3000
# Aplica migrations e sobe a API.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
