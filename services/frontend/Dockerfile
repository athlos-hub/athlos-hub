FROM node:20-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_LIVESTREAM_WS_URL
ARG NEXT_PUBLIC_HLS_URL
ARG NEXT_PUBLIC_NOTIFICATIONS_API_URL
ARG NEXT_PUBLIC_NOTIFICATIONS_WS_URL
ARG NEXT_PUBLIC_NOTIFICATIONS_SSE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_LIVESTREAM_WS_URL=$NEXT_PUBLIC_LIVESTREAM_WS_URL
ENV NEXT_PUBLIC_HLS_URL=$NEXT_PUBLIC_HLS_URL
ENV NEXT_PUBLIC_NOTIFICATIONS_API_URL=$NEXT_PUBLIC_NOTIFICATIONS_API_URL
ENV NEXT_PUBLIC_NOTIFICATIONS_WS_URL=$NEXT_PUBLIC_NOTIFICATIONS_WS_URL
ENV NEXT_PUBLIC_NOTIFICATIONS_SSE_URL=$NEXT_PUBLIC_NOTIFICATIONS_SSE_URL

ENV NEXT_ENABLE_TURBOPACK=0

RUN pnpm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next \
    && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN apk add --no-cache curl

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
