FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/engines-math/package.json ./packages/engines-math/
COPY packages/pdf-engine/package.json   ./packages/pdf-engine/
COPY apps/api/package.json              ./apps/api/
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/api/  ./apps/api/

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "--experimental-strip-types", "src/server.ts"]
