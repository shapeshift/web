FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.4.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/swap-widget-poc ./packages/swap-widget-poc
COPY packages/caip ./packages/caip
COPY packages/types ./packages/types

RUN yarn workspaces focus @shapeshiftoss/swap-widget-poc --production=false

WORKDIR /app/packages/swap-widget-poc
RUN yarn build

FROM node:20-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.4.0 --activate && \
    npm install -g serve

COPY --from=builder /app/packages/swap-widget-poc/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
