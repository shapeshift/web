# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root files needed for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/

# Copy only the affiliate-dashboard package.json for dependency resolution
# (pnpm workspace requires all referenced packages to exist, so copy minimal stubs)
COPY packages/affiliate-dashboard/package.json ./packages/affiliate-dashboard/

# Copy import method avoids hard-link failures from the pnpm store on Docker overlay FS
ENV NPM_CONFIG_PACKAGE_IMPORT_METHOD=copy

# Install dependencies
RUN corepack enable && \
    pnpm install --frozen-lockfile --ignore-scripts --filter @shapeshiftoss/affiliate-dashboard...

# Copy affiliate-dashboard source
COPY packages/affiliate-dashboard/ ./packages/affiliate-dashboard/

# Build the Vite app
WORKDIR /app/packages/affiliate-dashboard
RUN pnpm build

# Production stage — serve static files with nginx
FROM nginx:stable-alpine AS runner

# Copy built assets
COPY --from=builder /app/packages/affiliate-dashboard/dist /usr/share/nginx/html

# Copy nginx config template
COPY packages/affiliate-dashboard/nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
