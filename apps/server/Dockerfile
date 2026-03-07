FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/toolkit/package.json packages/toolkit/
COPY packages/model-providers/package.json packages/model-providers/
COPY packages/workflows/package.json packages/workflows/

RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/server/ apps/server/

RUN pnpm --filter @tuesday/shared build
RUN pnpm --filter @tuesday/toolkit build
RUN pnpm --filter @tuesday/model-providers build
RUN pnpm --filter @tuesday/workflows build
RUN pnpm --filter @tuesday/server exec prisma generate
RUN pnpm --filter @tuesday/server build

EXPOSE 4600
CMD ["node", "apps/server/dist/index.js"]
