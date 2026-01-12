FROM node:20-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g serve

WORKDIR /app

RUN git init

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

COPY packages/swap-widget-poc ./packages/swap-widget-poc
COPY packages/caip ./packages/caip  
COPY packages/types ./packages/types

RUN corepack enable

ENV YARN_ENABLE_SCRIPTS=false

RUN yarn workspaces focus @shapeshiftoss/swap-widget-poc --production=false

RUN yarn workspace @shapeshiftoss/types build
RUN yarn workspace @shapeshiftoss/caip build  
RUN yarn workspace @shapeshiftoss/swap-widget-poc build

WORKDIR /app/packages/swap-widget-poc

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
