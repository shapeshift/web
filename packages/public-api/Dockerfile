# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies (including Java for unchained-client code generation)
RUN apk add --no-cache python3 make g++ openjdk17-jre

# Copy workspace files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy all package.json files for workspace resolution (yarn requires all workspaces to be present)
# Uses a temporary stage to preserve directory structure and auto-include new packages
COPY packages/ /tmp/packages/
RUN cd /tmp/packages && for dir in */; do \
      mkdir -p /app/packages/"$dir" && \
      cp "$dir"package.json /app/packages/"$dir"; \
    done && rm -rf /tmp/packages

# Install dependencies (skip build/postinstall scripts that require git/cypress/etc)
RUN --mount=type=cache,id=s/5fa4b228-de48-4bb3-90d6-807d0c6e7f1c-/root/.yarn/berry/cache,target=/root/.yarn/berry/cache \
    yarn install --immutable --mode skip-build

# Copy unchained-client config and generator files FIRST (rarely changes, enables layer caching)
COPY packages/unchained-client/openapitools.json ./packages/unchained-client/
COPY packages/unchained-client/generator/ ./packages/unchained-client/generator/

# Generate unchained-client code (cached when openapitools.json unchanged)
RUN --mount=type=cache,id=s/5fa4b228-de48-4bb3-90d6-807d0c6e7f1c-/root/.openapitools,target=/root/.openapitools \
    yarn workspace @shapeshiftoss/unchained-client generate

# Copy remaining source files
COPY packages/ ./packages/
COPY public/generated/generatedAssetData.json ./public/generated/
COPY tsconfig.json tsconfig.packages.json ./

# Build all packages using parallel tsc with project references
RUN yarn run -T tsc --build tsconfig.packages.json && yarn postbuild:packages

# Build the public-api bundle
WORKDIR /app/packages/public-api
RUN yarn node esbuild.config.mjs

# Build smoke tests bundle
RUN yarn node esbuild.smoke-tests.mjs

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the bundled server, smoke tests, and asset data (node_modules not needed - esbuild bundles everything)
COPY --from=builder /app/packages/public-api/dist/server.cjs ./server.cjs
COPY --from=builder /app/packages/public-api/dist/smoke-tests.cjs ./smoke-tests.cjs
COPY --from=builder /app/public/generated/generatedAssetData.json ./public/generated/

# Set environment
ENV NODE_ENV=production
ENV ASSET_DATA_PATH=/app/public/generated/generatedAssetData.json

CMD ["node", "server.cjs"]
