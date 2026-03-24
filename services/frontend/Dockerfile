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

# Build-time público: use NEXT_PUBLIC_API_BASE_URL como única base de API.
ARG NEXT_PUBLIC_API_BASE_URL=https://athloshub.com.br/api/v1
ARG NEXT_PUBLIC_APP_URL=https://athloshub.com.br
ARG NEXT_PUBLIC_LIVESTREAM_WS_URL=https://athloshub.com.br
ARG NEXT_PUBLIC_HLS_URL=https://athloshub.com.br
ARG NEXT_PUBLIC_SCOREBOARD_WS_URL=wss://athloshub.com.br/api/v1
ARG NEXT_PUBLIC_RTMP_SERVER_URL=rtmp://athloshub.com.br
ARG NEXT_PUBLIC_MEDIAMTX_RTMP_PORT=1935

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_LIVESTREAM_WS_URL=$NEXT_PUBLIC_LIVESTREAM_WS_URL
ENV NEXT_PUBLIC_HLS_URL=$NEXT_PUBLIC_HLS_URL
ENV NEXT_PUBLIC_SCOREBOARD_WS_URL=$NEXT_PUBLIC_SCOREBOARD_WS_URL
ENV NEXT_PUBLIC_RTMP_SERVER_URL=$NEXT_PUBLIC_RTMP_SERVER_URL
ENV NEXT_PUBLIC_MEDIAMTX_RTMP_PORT=$NEXT_PUBLIC_MEDIAMTX_RTMP_PORT

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
