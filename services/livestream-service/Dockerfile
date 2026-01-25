FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN pnpm install --frozen-lockfile

COPY . .

# Increase Node memory available to the build to avoid "heap out of memory" errors
# Adjust as needed for your environment (2048 or 4096 MB are common values).
ENV NODE_OPTIONS=--max-old-space-size=4096

# Allow override at build time with --build-arg PRISMA_DATABASE_URL="..."
ARG PRISMA_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=livestream_schema"
# Prisma reads DATABASE_URL from env when generating client
ENV DATABASE_URL=${PRISMA_DATABASE_URL}

# Ensure Prisma client is generated so TypeScript types are available during build
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

USER nestjs

ENV NODE_ENV=production

EXPOSE 3333

CMD ["node", "dist/main.js"]
