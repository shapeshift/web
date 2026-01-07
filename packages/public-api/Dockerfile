# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

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

# Install dependencies
RUN yarn install --immutable

# Copy source files
COPY packages/ ./packages/
COPY public/generated/generatedAssetData.json ./public/generated/

# Build packages that public-api depends on
RUN yarn workspaces foreach -Rt --from @shapeshiftoss/public-api run build

# Build the public-api bundle
WORKDIR /app/packages/public-api
RUN yarn node esbuild.config.mjs

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy the bundled server and asset data
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
