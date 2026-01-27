FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=4096

ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 \
    && apk add --no-cache curl

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./

USER root
RUN chmod +x /app/docker-entrypoint.sh
USER nestjs

ENV NODE_ENV=production

EXPOSE 3333
ENTRYPOINT ["/app/docker-entrypoint.sh"]