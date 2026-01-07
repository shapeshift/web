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

# Install dependencies (skip build/postinstall scripts that require git/cypress/etc)
RUN yarn install --immutable --mode skip-build

# Copy source files
COPY packages/ ./packages/
COPY public/generated/generatedAssetData.json ./public/generated/
COPY tsconfig.json tsconfig.packages.json ./

# Build packages that public-api depends on
RUN yarn workspace @shapeshiftoss/errors build && \
    yarn workspace @shapeshiftoss/types build && \
    yarn workspace @shapeshiftoss/contracts build && \
    yarn workspace @shapeshiftoss/caip build && \
    yarn workspace @shapeshiftoss/utils build && \
    yarn workspace @shapeshiftoss/unchained-client build && \
    yarn workspace @shapeshiftoss/chain-adapters build && \
    yarn workspace @shapeshiftoss/swapper build && \
    yarn workspace @shapeshiftoss/public-api build

# Build the public-api bundle
WORKDIR /app/packages/public-api
RUN yarn node esbuild.config.mjs

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the bundled server and asset data (node_modules not needed - esbuild bundles everything)
COPY --from=builder /app/packages/public-api/dist/server.cjs ./server.cjs
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
