# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies (including Java for unchained-client code generation)
RUN apk add --no-cache python3 make g++ openjdk17-jre

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy all workspace package.json files for resolution (pnpm requires all workspaces present)
COPY packages/caip/package.json ./packages/caip/
COPY packages/chain-adapters/package.json ./packages/chain-adapters/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/errors/package.json ./packages/errors/
COPY packages/hdwallet-coinbase/package.json ./packages/hdwallet-coinbase/
COPY packages/hdwallet-core/package.json ./packages/hdwallet-core/
COPY packages/hdwallet-gridplus/package.json ./packages/hdwallet-gridplus/
COPY packages/hdwallet-integration/package.json ./packages/hdwallet-integration/
COPY packages/hdwallet-keepkey/package.json ./packages/hdwallet-keepkey/
COPY packages/hdwallet-keepkey-electron/package.json ./packages/hdwallet-keepkey-electron/
COPY packages/hdwallet-keepkey-nodehid/package.json ./packages/hdwallet-keepkey-nodehid/
COPY packages/hdwallet-keepkey-nodewebusb/package.json ./packages/hdwallet-keepkey-nodewebusb/
COPY packages/hdwallet-keepkey-tcp/package.json ./packages/hdwallet-keepkey-tcp/
COPY packages/hdwallet-keepkey-webusb/package.json ./packages/hdwallet-keepkey-webusb/
COPY packages/hdwallet-keplr/package.json ./packages/hdwallet-keplr/
COPY packages/hdwallet-ledger/package.json ./packages/hdwallet-ledger/
COPY packages/hdwallet-ledger-webhid/package.json ./packages/hdwallet-ledger-webhid/
COPY packages/hdwallet-ledger-webusb/package.json ./packages/hdwallet-ledger-webusb/
COPY packages/hdwallet-metamask-multichain/package.json ./packages/hdwallet-metamask-multichain/
COPY packages/hdwallet-native/package.json ./packages/hdwallet-native/
COPY packages/hdwallet-native-vault/package.json ./packages/hdwallet-native-vault/
COPY packages/hdwallet-phantom/package.json ./packages/hdwallet-phantom/
COPY packages/hdwallet-sandbox/package.json ./packages/hdwallet-sandbox/
COPY packages/hdwallet-trezor/package.json ./packages/hdwallet-trezor/
COPY packages/hdwallet-trezor-connect/package.json ./packages/hdwallet-trezor-connect/
COPY packages/hdwallet-vultisig/package.json ./packages/hdwallet-vultisig/
COPY packages/hdwallet-walletconnectv2/package.json ./packages/hdwallet-walletconnectv2/
COPY packages/hdwallet-seeker/package.json ./packages/hdwallet-seeker/
COPY packages/public-api/package.json ./packages/public-api/
COPY packages/swapper/package.json ./packages/swapper/
COPY packages/swap-widget/package.json ./packages/swap-widget/
COPY packages/types/package.json ./packages/types/
COPY packages/unchained-client/package.json ./packages/unchained-client/
COPY packages/utils/package.json ./packages/utils/

# Install dependencies (skip build/postinstall scripts that require git/cypress/etc)
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate && pnpm install --frozen-lockfile

# Copy unchained-client config and generator files FIRST (rarely changes, enables layer caching)
COPY packages/unchained-client/openapitools.json ./packages/unchained-client/
COPY packages/unchained-client/generator/ ./packages/unchained-client/generator/

# Generate unchained-client code (required by tsc --build for workspace packages)
RUN pnpm --filter @shapeshiftoss/unchained-client generate

# Copy remaining source files
COPY packages/ ./packages/
COPY public/generated/generatedAssetData.json ./public/generated/
COPY tsconfig.json tsconfig.packages.json ./

# Build all packages using parallel tsc with project references
RUN pnpm exec tsc --build tsconfig.packages.json && pnpm run postbuild:packages

# Build the swap-widget
WORKDIR /app/packages/swap-widget
RUN pnpm run build

# Production stage
FROM node:22-alpine AS runner

RUN npm install -g serve

WORKDIR /app

# Copy only the built static files (node_modules not needed - vite bundles everything)
COPY --from=builder /app/packages/swap-widget/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
