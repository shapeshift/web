# ShapeShift Web: GraphQL Backend PoC

## Executive Summary

Analysis of the HAR file reveals **643,000 HTTP requests** in a single session. The main thread is being flooded with network requests.

**Goal:** Reduce network requests using a GraphQL backend with DataLoader for batching/deduplication.

**Focus Areas:**
1. **Market Data** - Main focus (8-10 paginated calls → 1 batched call) ✅ IMPLEMENTED
2. **Portfolio getAccount** - Secondary (N account calls → batched) 🔜 PENDING
3. **TX History getTxHistory** - Secondary (N account calls → batched) 🔜 PENDING

---

## Implementation Status

### ✅ Phase 1: Foundation - COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create `packages/graphql-server/` | ✅ Done | Apollo Server 4 + TypeScript |
| Set up DataLoader | ✅ Done | Per-request batching |
| Add to workspace | ✅ Done | Works with `yarn` |
| Dev script | ✅ Done | `yarn graphql:dev` |

### ✅ Phase 2: Market Data - COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| MarketDataLoader | ✅ Done | Batches + caches requests |
| Unified market-service | ✅ Done | CoinGecko → CoinCap fallback chain |
| GraphQL client | ✅ Done | graphql-request + React Query |
| Feature flag | ✅ Done | `GraphQLMarketData` |
| Wire up to Redux | ✅ Done | Dispatches to `marketDataSlice` |
| Type generation | ✅ Done | `yarn graphql:codegen` |

### 🔜 Phase 3: Accounts + TX History - PENDING

| Task | Status | Notes |
|------|--------|-------|
| AccountLoader | 🔧 Scaffolded | Mock implementation |
| TxLoader | 🔧 Scaffolded | Mock implementation |
| Unchained integration | 🔜 Pending | Needs real API calls |
| Client integration | 🔜 Pending | |
| Feature flags | 🔜 Pending | `GraphQLAccounts`, `GraphQLTransactions` |

---

## What Was Built

### Server: `packages/graphql-server/`

```
packages/graphql-server/
├── src/
│   ├── index.ts              # Export entry
│   ├── server.ts             # Apollo Server startup
│   ├── schema.ts             # GraphQL type definitions
│   ├── resolvers/
│   │   └── index.ts          # Query resolvers
│   ├── loaders/
│   │   ├── index.ts          # Loader exports
│   │   ├── marketLoader.ts   # Market data DataLoader
│   │   ├── accountLoader.ts  # Account DataLoader (mock)
│   │   └── txLoader.ts       # Transaction DataLoader (mock)
│   └── datasources/
│       └── marketService.ts  # Unified CoinGecko/CoinCap service
├── package.json
└── tsconfig.json
```

### Client: `src/lib/graphql/`

```
src/lib/graphql/
├── index.ts                  # Public exports
├── client.ts                 # GraphQL client singleton
├── marketData.ts             # Market data fetcher
├── useGraphQLMarketData.ts   # React Query hook
└── generated/
    └── types.ts              # Generated types from schema
```

### Key Files Modified

| File | Changes |
|------|---------|
| `src/config.ts` | Added `VITE_GRAPHQL_ENDPOINT` and `VITE_FEATURE_GRAPHQL_MARKET_DATA` |
| `src/state/slices/preferencesSlice/preferencesSlice.ts` | Added `GraphQLMarketData` feature flag |
| `src/test/mocks/store.ts` | Added mock for feature flag |
| `src/context/AppProvider/AppContext.tsx` | Integrated GraphQL market data hook with feature flag |
| `.env.development` | Enabled feature flag for development |
| `package.json` | Added `graphql:dev`, `graphql:codegen`, `dev:graphql-poc` scripts |
| `codegen.ts` | GraphQL codegen configuration |

---

## How It Works

### Market Data Flow (GraphQL Mode)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│  GraphQL Server  │────▶│    CoinGecko    │
│                 │     │                  │     │    (primary)    │
│ useGraphQL      │     │  DataLoader      │     └─────────────────┘
│ MarketData()    │     │  batches all     │            │
│                 │     │  requests        │            ▼ (fallback)
│ Dispatches to   │     │                  │     ┌─────────────────┐
│ Redux store     │◀────│  Returns unified │◀────│     CoinCap     │
└─────────────────┘     │  response        │     │   (secondary)   │
                        └──────────────────┘     └─────────────────┘
```

### DataLoader Batching

```typescript
// Multiple components request different assets in the same tick:
loader.load('eip155:1/slip44:60')  // ETH
loader.load('bip122:.../slip44:0') // BTC
loader.load('cosmos:.../slip44:118') // ATOM

// DataLoader batches into single call:
batchGetMarketData(['eip155:1/slip44:60', 'bip122:.../slip44:0', 'cosmos:.../slip44:118'])

// Unified market service makes ONE CoinGecko API call (not 3)
```

### Feature Flag Integration

```typescript
// In AppContext.tsx
const isGraphQLMarketDataEnabled = useFeatureFlag('GraphQLMarketData')

// When enabled: Uses useGraphQLMarketData() hook
// When disabled: Falls back to existing RTK Query polling
```

---

## Running the PoC

### Development

```bash
# Run both GraphQL server and web app concurrently:
yarn dev:graphql-poc

# Or run separately:
yarn graphql:dev     # Terminal 1: GraphQL server on :4000
yarn dev             # Terminal 2: Web app on :3000
```

### Testing the GraphQL Server

```bash
# Health check
curl http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health }"}'

# Market data query
curl http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetMarketData($assetIds: [String!]!) { marketData(assetIds: $assetIds) { assetId price marketCap changePercent24Hr } }",
    "variables": {
      "assetIds": [
        "eip155:1/slip44:60",
        "bip122:000000000019d6689c085ae165831e93/slip44:0"
      ]
    }
  }'
```

### Type Generation

```bash
# Regenerate types after schema changes (requires server running):
yarn graphql:codegen
```

---

## GraphQL Schema

```graphql
scalar AssetId
scalar AccountId

type Query {
  # Market data - batched via DataLoader
  marketData(assetIds: [String!]!): [MarketData]!

  # Account balances - batched via DataLoader (mock)
  accounts(accountIds: [String!]!): [Account]!

  # Transaction history - batched via DataLoader (mock)
  transactions(accountIds: [String!]!, limit: Int, cursor: String): TransactionConnection!

  # Health check
  health: String!
}

type MarketData {
  assetId: String!
  price: String!
  marketCap: String!
  volume: String!
  changePercent24Hr: Float!
  supply: String
  maxSupply: String
}

type Account {
  id: String!
  balance: String!
  pubkey: String!
  chainId: String!
  assetId: String!
  tokens: [TokenBalance!]!
}

type TokenBalance {
  assetId: String!
  balance: String!
  name: String
  symbol: String
  precision: Int
}

type Transaction {
  txid: String!
  pubkey: String!
  blockHeight: Int
  blockTime: Int
  status: String!
  fee: String
  transfers: [TxTransfer!]!
}

type TxTransfer {
  type: String!
  assetId: String!
  value: String!
  from: [String!]!
  to: [String!]!
}

type TransactionEdge {
  node: Transaction!
  cursor: String!
  accountId: String!
}

type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

---

## Unified Market Service Pattern

The `marketService.ts` implements the same fallback/exhaust pattern as the existing `market-service-manager.ts`:

```typescript
class MarketServiceManager {
  private providers: MarketService[] = [
    new CoinGeckoService(),  // Primary
    new CoinCapService(),    // Fallback
  ]

  async findByAssetIds(assetIds: string[]): Promise<Map<string, MarketData>> {
    // Filter out NFTs
    const validAssetIds = assetIds.filter(id => !id.includes('/erc721:'))

    const result = new Map<string, MarketData>()
    let remaining = [...validAssetIds]

    // Try each provider in order (exhaust pattern)
    for (const provider of this.providers) {
      if (remaining.length === 0) break

      const providerResults = await provider.findByAssetIds(remaining)

      for (const [assetId, data] of providerResults) {
        result.set(assetId, data)
        remaining = remaining.filter(id => id !== assetId)
      }
    }

    return result
  }
}
```

---

## Expected Benefits

| Metric | Before | After (GraphQL) | Improvement |
|--------|--------|-----------------|-------------|
| Market data requests/min | 8-10 (paginated) | 1 (batched) | ~90% reduction |
| Assets fetched | 2000+ (all) | ~50 (portfolio only) | ~97% reduction |
| Duplicate requests | Many (per component) | 0 (DataLoader dedup) | 100% reduction |
| Bandwidth | High | Low | Significant |

---

## Remaining Work (Phase 3)

### Unchained Integration

Replace mock implementations in `accountLoader.ts` and `txLoader.ts` with real Unchained API calls:

```typescript
// Current: Mock implementation
async function fetchFromUnchained(chainId: string, accounts: {...}[]): Promise<Account[]> {
  await new Promise(resolve => setTimeout(resolve, 50)) // Simulated delay
  return accounts.map(/* mock data */)
}

// TODO: Replace with real Unchained client
async function fetchFromUnchained(chainId: string, accounts: {...}[]): Promise<Account[]> {
  const unchainedClient = getUnchainedClient(chainId)
  return Promise.all(accounts.map(a => unchainedClient.getAccount(a.pubkey)))
}
```

### Client Integration

Wire up `useGraphQLAccounts` and `useGraphQLTransactions` hooks similar to `useGraphQLMarketData`:

1. Add `GraphQLAccounts` and `GraphQLTransactions` feature flags
2. Create hooks that fetch via GraphQL and dispatch to Redux
3. Modify `usePortfolioFetch.tsx` to use GraphQL when enabled
4. Modify `txHistorySlice.ts` to use GraphQL when enabled

---

## Sanity Check Criteria

For another agent to verify this implementation:

### ✅ Server Checks

1. **Server starts without errors:**
   ```bash
   yarn graphql:dev
   # Should see: 🚀 GraphQL server ready at http://localhost:4000/
   ```

2. **Health endpoint works:**
   ```bash
   curl -s http://localhost:4000/graphql -H "Content-Type: application/json" \
     -d '{"query": "{ health }"}'
   # Should return: {"data":{"health":"OK"}}
   ```

3. **Market data returns real prices:**
   ```bash
   curl -s http://localhost:4000/graphql -H "Content-Type: application/json" \
     -d '{"query": "{ marketData(assetIds: [\"eip155:1/slip44:60\"]) { assetId price } }"}'
   # Should return real ETH price (e.g., ~$3100)
   ```

### ✅ Client Checks

1. **Types compile:**
   ```bash
   yarn type-check
   # Should pass with no errors
   ```

2. **Lint passes:**
   ```bash
   yarn lint
   # Should pass with no errors
   ```

3. **Feature flag exists:**
   - Check `src/state/slices/preferencesSlice/preferencesSlice.ts` has `GraphQLMarketData`
   - Check `.env.development` has `VITE_FEATURE_GRAPHQL_MARKET_DATA=true`

4. **GraphQL client is wired up:**
   - `src/context/AppProvider/AppContext.tsx` should import and use `useGraphQLMarketData`
   - The hook should be enabled when `isGraphQLMarketDataEnabled` is true

### ✅ Integration Check

1. **Run full dev environment:**
   ```bash
   yarn dev:graphql-poc
   ```

2. **Open browser devtools Network tab**

3. **With feature flag enabled:**
   - Should see GraphQL requests to `localhost:4000/graphql`
   - Should NOT see paginated CoinGecko requests

4. **Toggle feature flag off (in /flags UI):**
   - Should fall back to existing RTK Query market data polling

---

## File Reference

### New Files Created

| Path | Purpose |
|------|---------|
| `packages/graphql-server/` | GraphQL server package |
| `packages/graphql-server/src/server.ts` | Apollo Server entry point |
| `packages/graphql-server/src/schema.ts` | GraphQL type definitions |
| `packages/graphql-server/src/resolvers/index.ts` | Query resolvers |
| `packages/graphql-server/src/loaders/marketLoader.ts` | Market data DataLoader |
| `packages/graphql-server/src/loaders/accountLoader.ts` | Account DataLoader (mock) |
| `packages/graphql-server/src/loaders/txLoader.ts` | Transaction DataLoader (mock) |
| `packages/graphql-server/src/datasources/marketService.ts` | Unified CoinGecko/CoinCap |
| `src/lib/graphql/client.ts` | GraphQL client singleton |
| `src/lib/graphql/marketData.ts` | Market data fetcher |
| `src/lib/graphql/useGraphQLMarketData.ts` | React Query hook |
| `src/lib/graphql/generated/types.ts` | Generated TypeScript types |
| `codegen.ts` | GraphQL codegen configuration |

### Modified Files

| Path | Changes |
|------|---------|
| `src/config.ts` | Added GraphQL env vars |
| `src/state/slices/preferencesSlice/preferencesSlice.ts` | Added feature flag |
| `src/test/mocks/store.ts` | Added mock for feature flag |
| `src/context/AppProvider/AppContext.tsx` | Integrated GraphQL hook |
| `.env.development` | Enabled feature flag |
| `package.json` | Added npm scripts |
