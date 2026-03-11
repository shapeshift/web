# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/
COPY packages/affiliate-dashboard/package.json ./packages/affiliate-dashboard/

ENV NPM_CONFIG_PACKAGE_IMPORT_METHOD=copy
RUN corepack enable && \
    pnpm install --frozen-lockfile --ignore-scripts --filter @shapeshiftoss/affiliate-dashboard...

COPY packages/affiliate-dashboard/index.html ./packages/affiliate-dashboard/
COPY packages/affiliate-dashboard/tsconfig.json ./packages/affiliate-dashboard/
COPY packages/affiliate-dashboard/tsconfig.node.json ./packages/affiliate-dashboard/
COPY packages/affiliate-dashboard/vite.config.ts ./packages/affiliate-dashboard/
COPY packages/affiliate-dashboard/src/ ./packages/affiliate-dashboard/src/

WORKDIR /app/packages/affiliate-dashboard
RUN pnpm build

FROM nginx:stable-alpine AS runner
COPY --from=builder /app/packages/affiliate-dashboard/dist /usr/share/nginx/html
RUN printf 'server {\n\
    listen       8080;\n\
    server_name  _;\n\
    root         /usr/share/nginx/html;\n\
    index        index.html;\n\
    location /v1/ {\n\
        proxy_pass         ${API_URL}/v1/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header   Host              $host;\n\
        proxy_set_header   X-Real-IP         $remote_addr;\n\
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;\n\
        proxy_set_header   X-Forwarded-Proto $scheme;\n\
    }\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/templates/default.conf.template
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
