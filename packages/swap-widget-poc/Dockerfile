FROM node:20-slim AS builder

WORKDIR /app

COPY packages/caip/package.json ./packages/caip/
COPY packages/caip/src ./packages/caip/src
COPY packages/caip/tsconfig.json ./packages/caip/
COPY packages/caip/tsconfig.cjs.json ./packages/caip/
COPY packages/caip/tsconfig.esm.json ./packages/caip/

COPY packages/swap-widget-poc ./packages/swap-widget-poc

WORKDIR /app/packages/caip
RUN npm install
RUN npm install -D typescript tsc-esm-fix
RUN npx tsc --build
RUN npx tsc-esm-fix --target=dist/esm --ext=.js
RUN echo '{"type": "commonjs"}' > dist/cjs/package.json

WORKDIR /app/packages/swap-widget-poc
RUN sed -i 's/"@shapeshiftoss\/caip": "workspace:\*"/"@shapeshiftoss\/caip": "file:..\/caip"/g' package.json
RUN npm install --legacy-peer-deps
RUN npm run build

FROM node:20-slim

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app/packages/swap-widget-poc/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
