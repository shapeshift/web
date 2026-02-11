FROM node:20-slim AS builder

WORKDIR /app

COPY . ./

RUN corepack enable
RUN yarn install
RUN yarn build

FROM node:20-slim

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
