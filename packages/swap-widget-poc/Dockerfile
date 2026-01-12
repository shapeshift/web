FROM node:20-slim AS builder

WORKDIR /app

COPY packages/swap-widget-poc ./

RUN npm install --legacy-peer-deps
RUN npm run build

FROM node:20-slim

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
