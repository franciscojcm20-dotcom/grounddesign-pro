FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
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

WORKDIR /app/apps/web
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
