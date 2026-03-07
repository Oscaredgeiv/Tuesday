FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN pnpm --filter @tuesday/shared build

EXPOSE 5173
CMD ["pnpm", "--filter", "@tuesday/web", "dev", "--host"]
