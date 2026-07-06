FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/engines-math/package.json ./packages/engines-math/
COPY packages/pdf-engine/package.json   ./packages/pdf-engine/
COPY apps/web/package.json              ./apps/web/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/ ./packages/
COPY apps/web/  ./apps/web/

# Next.js hornea las variables NEXT_PUBLIC_* dentro del bundle del cliente en
# build-time — deben declararse como ARG y reexportarse como ENV *antes* de
# `pnpm run build`, o el valor pasado con --build-arg se ignora en silencio
# (Docker no falla, simplemente no lo propaga) y el build cae al fallback de
# apiBase.ts en producción, que no funciona igual entre servicios separados
# (api y web) como los de AWS App Runner.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

WORKDIR /app/apps/web
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
