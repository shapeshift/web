# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies (including Java for unchained-client code generation)
RUN apk add --no-cache python3 make g++ openjdk17-jre

# Copy workspace files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy all package.json files for workspace resolution
COPY packages/public-api/package.json ./packages/public-api/
COPY packages/caip/package.json ./packages/caip/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/swapper/package.json ./packages/swapper/
COPY packages/chain-adapters/package.json ./packages/chain-adapters/
COPY packages/unchained-client/package.json ./packages/unchained-client/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/errors/package.json ./packages/errors/

# Install dependencies with Railway cache mount (skip build/postinstall scripts that require git/cypress/etc)
RUN --mount=type=cache,id=s/5fa4b228-de48-4bb3-90d6-807d0c6e7f1c-/root/.yarn/berry/cache,target=/root/.yarn/berry/cache \
    yarn install --immutable --mode skip-build

# Copy unchained-client config and generator files FIRST (rarely changes, enables layer caching)
COPY packages/unchained-client/openapitools.json ./packages/unchained-client/
COPY packages/unchained-client/generator/ ./packages/unchained-client/generator/

# Generate unchained-client code (cached when openapitools.json unchanged)
# Cache mount for OpenAPI Generator JAR to avoid re-downloading on each build
RUN --mount=type=cache,id=s/5fa4b228-de48-4bb3-90d6-807d0c6e7f1c-/root/.openapitools,target=/root/.openapitools \
    yarn workspace @shapeshiftoss/unchained-client generate

# Copy remaining source files
COPY packages/ ./packages/
COPY public/generated/generatedAssetData.json ./public/generated/
COPY tsconfig.json tsconfig.packages.json ./

# Build all packages using parallel tsc with project references
RUN yarn run -T tsc --build tsconfig.packages.json && \
    yarn workspaces foreach -ptiv --include '@shapeshiftoss/{errors,types,contracts,caip,utils,unchained-client,chain-adapters,swapper,public-api}' run postbuild

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
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server.cjs"]
