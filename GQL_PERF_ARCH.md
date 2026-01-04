# GraphQL Performance & Architecture Plan

## Problem Statement

Two major pain points in ShapeShift Web:
1. **Over-fetching & main thread spew** - Too many redundant API calls
2. **Redux acting as a DB** - Complex normalized `byId/allIds` patterns that's ugly and inefficient

## Anti-Pattern to Avoid

**⚠️ CRITICAL**: Don't just move the "client-side DB" problem from Redux to Apollo. The goal is to **eliminate the DB pattern entirely**, not relocate it.

| ❌ Anti-Pattern | ✅ Correct Approach |
|-----------------|---------------------|
| Store everything in client cache | Fetch on-demand, cache responses |
| Normalize all entities client-side | Let GraphQL server normalize/batch |
| Complex client selectors | Simple query results |
| Manual cache invalidation | Stale-while-revalidate pattern |

---

## Option A: TanStack Query + graphql-request (Recommended Start)

**Why start here:**
- Already familiar with react-query patterns
- Simpler mental model
- ~25KB smaller bundle than Apollo
- Easier to reason about cache behavior

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Components                         │
├─────────────────────────────────────────────────────────────────┤
│  useQuery (TanStack)     │    useAppSelector                    │
│  (Server State)          │    (Client State)                    │
├──────────────────────────┼──────────────────────────────────────┤
│   TanStack Query Cache   │         Redux Store                  │
│   ┌─────────────────┐    │    ┌─────────────────────┐           │
│   │ Query keys:     │    │    │ preferences         │           │
│   │ ['market', ids] │    │    │ tradeInput          │           │
│   │ ['accounts',ids]│    │    │ localWallet         │           │
│   │ ['thornode',..]│    │    │ addressBook         │           │
│   └─────────────────┘    │    └─────────────────────┘           │
├──────────────────────────┴──────────────────────────────────────┤
│                     GraphQL Server                               │
│    (Thornode, CoinGecko, Portals, CowSwap, Unchained)           │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

**New Files:**
```
src/lib/graphql/
├── queryClient.ts          # TanStack Query client config
├── queries/
│   ├── useMarketData.ts    # useQuery(['market', assetIds], ...)
│   ├── useAccounts.ts      # useQuery(['accounts', accountIds], ...)
│   ├── useThornode.ts      # useQuery(['thornode', 'pools'], ...)
│   └── usePortals.ts       # useQuery(['portals', chainId, addr], ...)
└── client.ts               # graphql-request client (existing)
```

**Pattern:**
```typescript
// src/lib/graphql/queries/useMarketData.ts
import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { graphqlClient } from '../client'

const MARKET_DATA_QUERY = gql`
  query MarketData($assetIds: [AssetId!]!) {
    market {
      data(assetIds: $assetIds) {
        data { assetId price marketCap volume }
        error { code message }
      }
    }
  }
`

export function useMarketData(assetIds: string[]) {
  return useQuery({
    queryKey: ['market', 'data', assetIds],
    queryFn: () => graphqlClient.request(MARKET_DATA_QUERY, { assetIds }),
    staleTime: 30_000,      // Consider fresh for 30s
    gcTime: 5 * 60_000,     // Keep in cache 5min
    enabled: assetIds.length > 0,
  })
}
```

**Query Key Strategy (Solves Over-fetching):**
```typescript
// Hierarchical keys enable smart invalidation
['market']                          // All market data
['market', 'data']                  // All market.data queries
['market', 'data', [assetId1, ...]] // Specific query
['thornode']                        // All thornode data
['thornode', 'pools']               // All pools
['thornode', 'savers', asset]       // Specific asset savers
```

### What Gets Removed from Redux

| Redux Slice | Replaced By | Pattern |
|-------------|-------------|---------|
| `marketDataSlice` | `useMarketData()` | Query cache |
| `assetsSlice` | `useAssets()` | Query cache |
| `portfolioSlice` | `useAccounts()` | Query cache |
| `opportunitiesSlice` | `useThornode().savers` | Query cache |
| `txHistorySlice` | `useTransactions()` | Query cache + pagination |

**Keep in Redux:**
- `preferencesSlice` - User settings
- `tradeInputSlice` - Form state
- `localWalletSlice` - Wallet connection
- `addressBookSlice` - Saved addresses

---

## Option B: Apollo Client (Future Upgrade Path)

**When to upgrade:**
- Need normalized cache (entity relationships)
- Need subscriptions (real-time CowSwap orders)
- Need field policies (complex derived state)

### Key Differences from Option A

| Feature | TanStack Query | Apollo Client |
|---------|----------------|---------------|
| Cache | Query-level | Normalized entities |
| Dedup | By query key | By `__typename:id` |
| Subscriptions | Manual | Built-in |
| Bundle | ~13KB | ~38KB |
| Selectors | React hooks | Field policies |

### Apollo Config (When Ready)

```typescript
// src/lib/apollo/cache.ts
const cache = new InMemoryCache({
  typePolicies: {
    // Use domain IDs, not generic 'id'
    Account: { keyFields: ['id'] },
    Pool: { keyFields: ['asset'] },
    Saver: { keyFields: ['assetAddress', 'asset'] },
    Borrower: { keyFields: ['owner', 'asset'] },
    MarketData: { keyFields: ['assetId'] },
  }
})
```

### Fragment Colocation (Apollo-Specific Benefit)

```typescript
// Child declares needs
export const ASSET_ROW_FRAGMENT = gql`
  fragment AssetRow_Asset on Asset { assetId name symbol }
`

// Parent fetches once, children read cache
function AssetRow({ assetRef }) {
  const { data } = useFragment({ fragment: ASSET_ROW_FRAGMENT, from: assetRef })
}
```

---

## Implementation Phases

### Phase 1: Schema Cleanup ✅ (Done)
- [x] Namespace pattern (`thornode`, `portals`, `cowswap`)
- [x] Remove deprecated queries/types
- [x] Clean type names (`Pool` not `ThornodePool`)
- [ ] Update resolvers for new structure

### Phase 2: TanStack Query Setup
```
Files to create:
- src/lib/graphql/queryClient.ts
- src/lib/graphql/queries/useMarketData.ts
- src/lib/graphql/queries/useAccounts.ts
- src/lib/graphql/queries/useThornode.ts
- src/lib/graphql/queries/usePortals.ts
- src/lib/graphql/queries/useCowswap.ts
```

### Phase 3: Migrate First Slice (Market Data)
1. Create `useMarketData()` hook
2. Replace `useAppSelector(selectMarketData)` calls
3. Remove `marketDataSlice`
4. Remove `marketApi` RTK Query endpoint

### Phase 4: Migrate Remaining Slices
- Portfolio → `useAccounts()`
- Assets → static data or `useAssets()`
- Opportunities → `useThornode().savers/borrowers`
- TxHistory → `useTransactions()` with pagination

### Phase 5 (Stretch): Persistence
```typescript
// Optional: persist TanStack cache
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const persister = createSyncStoragePersister({ storage: localforage })
persistQueryClient({ queryClient, persister })
```

---

## Solving the Pain Points

### Pain Point 1: Over-fetching

| Before | After |
|--------|-------|
| Multiple components fetch same data | Query deduplication by key |
| No request batching | GraphQL batches at server |
| Waterfall requests | Parallel queries |
| Manual refetch logic | `staleTime` + `gcTime` |

**Example:**
```typescript
// Before: 5 components, 5 API calls
useEffect(() => fetchMarketData(assetId), [assetId])

// After: 5 components, 1 request (deduped by key)
useMarketData([assetId1, assetId2, ...])
```

### Pain Point 2: Redux as DB

| Before | After |
|--------|-------|
| `byId/allIds` normalization | Query results as-is |
| Complex selectors | Simple hook returns |
| Manual cache invalidation | `staleTime` expiry |
| Global state tree | Colocated queries |

**Example:**
```typescript
// Before: Redux DB pattern
const asset = useAppSelector(state =>
  state.assets.byId[assetId]
)

// After: Direct query result
const { data: asset } = useAsset(assetId)
```

---

## Files Summary

### Server (Already Modified)
| File | Status |
|------|--------|
| `packages/graphql-server/src/schema.ts` | ✅ Updated |
| `packages/graphql-server/src/resolvers/index.ts` | 🔄 Needs namespace resolvers |

### Client (To Create)
| File | Purpose |
|------|---------|
| `src/lib/graphql/queryClient.ts` | TanStack Query config |
| `src/lib/graphql/queries/*.ts` | Query hooks |

### Client (To Delete - After Migration)
| File | Reason |
|------|--------|
| `src/state/slices/marketDataSlice/` | → `useMarketData()` |
| `src/state/slices/assetsSlice/` | → `useAssets()` |
| `src/state/slices/portfolioSlice/` | → `useAccounts()` |
| `src/state/apis/market.ts` | → Query hooks |
| `src/lib/graphql/coingeckoData.ts` | → `market` namespace |

### Client (Keep)
| File | Reason |
|------|--------|
| `src/state/slices/preferencesSlice/` | Client-only state |
| `src/state/slices/tradeInputSlice/` | Form state |
| `src/state/slices/localWalletSlice/` | Wallet connection |

---

## Comparison Summary

| Aspect | TanStack Query (Start) | Apollo Client (Later) |
|--------|----------------------|----------------------|
| Learning curve | Low (familiar) | Medium (new concepts) |
| Over-fetching fix | ✅ Query dedup | ✅ + Fragment colocation |
| Redux-as-DB fix | ✅ Remove slices | ✅ + Normalized cache |
| Bundle size | +13KB | +38KB |
| Subscriptions | Manual WebSocket | Built-in |
| Persistence | Optional plugin | apollo3-cache-persist |
| Migration effort | Lower | Higher |

**Recommendation**: Start with TanStack Query (Phase 2-4), add Apollo later if needed.

---

---

## Server Hosting Costs & Caching Strategy

### Railway Pricing Estimate

Based on [Railway pricing](https://railway.com/pricing):

| Tier | Cost | Includes |
|------|------|----------|
| Hobby | $5/mo | ~500 CPU-hours included |
| Overage | $0.016/CPU-hr | Pay-as-you-go |
| Pro | $20/mo | Higher limits, team features |

**Cost Scenarios:**

| Users/Day | Requests/Day | Est. Monthly Cost | Notes |
|-----------|--------------|-------------------|-------|
| 100 | 10k | **$5** (hobby tier) | Fits in free usage |
| 1,000 | 100k | **$10-20** | Some overage |
| 10,000 | 1M | **$50-100** | Need caching optimization |
| 100,000 | 10M | **$200-500+** | Need Redis + CDN |

**Key insight**: Cost scales with CPU usage, not requests. Good caching = massive savings.

---

### Current Caching Status

| Data Source | Cross-Request Cache | TTL | Status |
|-------------|---------------------|-----|--------|
| Market Data | ✅ Yes | 60s | Good |
| CoinGecko | ✅ Yes | 60s | Good |
| Thornode | ✅ Yes | 30s | Good |
| Portals Platforms | ✅ Yes | 5min | Good |
| **Account Balances** | ❌ No | - | **Needs fix** |
| **Transactions** | ❌ No | - | **Needs fix** |
| **Portals Accounts** | ❌ No | - | **Needs fix** |
| **CowSwap Orders** | ⚠️ Unbounded | - | **Risk** |

### Caching Improvements (Cost Optimization)

#### 1. Server-Side TTL Caching (Quick Wins)

```typescript
// Add to accountLoader.ts - 30s cache for balances
const accountCache = new Map<string, { data: Account; timestamp: number }>()
const ACCOUNT_TTL = 30_000 // 30 seconds

// Add to txLoader.ts - 5min cache for tx history
const txCache = new Map<string, { data: Tx[]; timestamp: number }>()
const TX_TTL = 5 * 60_000 // 5 minutes (txs don't change often)
```

**Impact**: 60-80% reduction in upstream API calls

#### 2. Client-Side Freshness (TanStack Query)

```typescript
// Client tells server "I already have data from X seconds ago"
const { data } = useQuery({
  queryKey: ['accounts', accountIds],
  queryFn: fetchAccounts,
  staleTime: 30_000,    // Don't refetch if < 30s old
  gcTime: 5 * 60_000,   // Keep in memory 5min
})
```

**Impact**: Eliminates redundant requests entirely

#### 3. HTTP Cache Headers (CDN-able)

```typescript
// In resolvers - set cache hints
context.cacheControl.setCacheHint({ maxAge: 60, scope: 'PUBLIC' })

// Response headers
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

**Impact**: CDN can cache public data (prices, pools)

#### 4. Persisted Queries (Future)

```typescript
// Instead of sending full query:
POST /graphql { query: "{ market { data(assetIds: [...]) } }" }

// Send hash:
GET /graphql?extensions={"persistedQuery":{"sha256Hash":"abc123"}}
```

**Impact**:
- Queries become GET requests (cacheable)
- 91% reduction in request size (per Shopify)
- CDN can cache responses

---

### Recommended Caching Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client                                   │
│                  TanStack Query Cache                           │
│                   (staleTime: 30s)                              │
├─────────────────────────────────────────────────────────────────┤
│                    CDN (Optional)                               │
│              Cache-Control: max-age=60                          │
├─────────────────────────────────────────────────────────────────┤
│                   GraphQL Server                                │
│            ┌─────────────────────────┐                          │
│            │   In-Memory TTL Cache   │                          │
│            │   - Market: 60s         │                          │
│            │   - Accounts: 30s       │                          │
│            │   - Pools: 30s          │                          │
│            │   - TxHistory: 5min     │                          │
│            └─────────────────────────┘                          │
├─────────────────────────────────────────────────────────────────┤
│                   External APIs                                 │
│      (Thornode, CoinGecko, Portals, Unchained)                 │
└─────────────────────────────────────────────────────────────────┘
```

### TTL Recommendations by Data Type

| Data Type | Recommended TTL | Rationale |
|-----------|-----------------|-----------|
| Asset metadata | 24 hours | Rarely changes |
| Pool list | 5 min | New pools rare |
| Pool details | 30s | Balances change |
| Market prices | 30-60s | Updates frequently |
| Price history | 5 min | Historical, stable |
| Account balances | 30s | Can change anytime |
| Transaction history | 5 min | Append-only |
| Platforms list | 1 hour | Static reference data |
| Borrowers/Savers | 1 min | Position changes |

### Cost Optimization Summary

| Optimization | Implementation | Cost Reduction |
|--------------|----------------|----------------|
| Server TTL caching | Add to loaders | 60-80% |
| Client staleTime | TanStack Query | 40-60% |
| HTTP caching | Cache-Control headers | 30-50% (with CDN) |
| Persisted queries | Future phase | 50-90% |

**Bottom line**: With proper caching, even 100k users/day should cost **< $20/month**.

---

## Incremental Delivery with @stream/@defer

### Problem Statement

Current architecture batches requests but returns all data at once:
- Portfolio waits for ALL accounts to load before showing anything
- Market data waits for ALL assets before rendering
- User sees skeleton → full data (jarring transition)

**Goal**: Single batched request, but responses arrive incrementally as each item resolves.

### Server Support Status

**Apollo Server 4.11.0 ALREADY SUPPORTS @stream/@defer** ✅

- Uses multipart HTTP responses (RFC 1341)
- No server configuration needed - enabled by default
- Just add directives to schema and return async iterators from resolvers

### Client Support Status

**graphql-request 7.4.0 does NOT support streaming** ❌

Current client is designed for simple fetch-and-return, not streaming responses.

### Client Approach Options

#### Option A: Custom Multipart HTTP Fetch (Recommended)

**Pros:**
- Zero bundle size increase (uses native `fetch()`)
- Works with existing patterns
- Simple conceptually

**Cons:**
- Need to implement multipart response parser
- Browser compatibility (needs feature detection)

```typescript
// Pattern: Read multipart/mixed response stream
async function* executeStreamingQuery<T>(query: string, variables: unknown) {
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'multipart/mixed; deferSpec=20220824, application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  // Parse multipart boundaries, yield JSON payloads as they arrive
  for await (const chunk of parseMultipartStream(response.body)) {
    yield chunk;
  }
}
```

#### Option B: graphql-ws WebSocket

**Pros:**
- Already in dependencies
- Simpler implementation
- Built-in reconnection

**Cons:**
- Requires persistent connection for one-shot queries
- Overhead for non-subscription use cases
- Server needs to support queries over WS

```typescript
// Pattern: Use existing WS client for streaming queries
const wsClient = getGraphQLWsClient();
wsClient.subscribe({ query, variables }, {
  next: (result) => dispatch(upsertPartialData(result)),
  complete: () => setIsComplete(true),
  error: console.error,
});
```

#### Option C: Apollo Client

**Pros:**
- Best-in-class @defer/@stream support
- Normalized cache with incremental updates
- Built-in hooks

**Cons:**
- ~100KB+ bundle size increase
- Major refactor needed
- Overkill for current needs

### Schema Changes Required

```graphql
# Add @stream for lists - emit items as they resolve
type Query {
  accounts(accountIds: [String!]!): [Account!]! @stream(initialCount: 0)
}

type Market {
  data(assetIds: [AssetId!]!): [MarketDataResult!]! @stream(initialCount: 0)
}

type Thornode {
  allSavers(assets: [String!]!): [[Saver!]!]! @stream(initialCount: 0)
  allBorrowers(assets: [String!]!): [[Borrower!]!]! @stream(initialCount: 0)
}

# Add @defer for heavy fields - load after initial response
type Account {
  id: AccountId!
  balance: String!           # Fast - immediate
  details: AccountDetails @defer  # Heavy - deferred
}
```

### Resolver Pattern for Streaming

```typescript
// Return async iterator for @stream fields
Query: {
  accounts: async function* (_parent, { accountIds }, context) {
    for (const accountId of accountIds) {
      const account = await context.loaders.accounts.load(accountId);
      yield account;  // Sent immediately as it resolves
    }
  },
}
```

### Use Cases by Domain

| Domain | Directive | Benefit |
|--------|-----------|---------|
| **Accounts** | `@stream` on list | Show each account row as it loads |
| **Account.details** | `@defer` on field | Show balance immediately, details later |
| **Market data** | `@stream` on list | Progressive price population |
| **Thornode pools** | `@stream` on list | Earn page loads progressively |
| **Portals positions** | `@stream` on list | DeFi positions appear incrementally |

### UI Integration Pattern

```typescript
// Progressive skeleton replacement
function AccountList({ accountIds }) {
  const { data, isStreaming } = useStreamingAccounts(accountIds);

  return accountIds.map(id => {
    const account = data?.find(a => a.id === id);
    return account ? <AccountRow data={account} /> : <Skeleton />;
  });
}
```

### Current vs Streaming Timeline

```
CURRENT (batch):
[Request]────────────────────────────────[All Data]
          ← 3-5 seconds wait →            ← render

STREAMING (@stream):
[Request]──[Acc1]──[Acc2]──[Acc3]──[Acc4]──[Done]
            ↓       ↓       ↓       ↓
          render  render  render  render
          ← progressive updates →
```

### Implementation Priority (Future)

1. **Accounts** - Highest impact, 10+ accounts per wallet
2. **Market data** - 100+ assets, visible improvement
3. **Thornode** - Earn page positions
4. **Portals** - DeFi positions

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Browser compatibility | Feature detection + fallback to batch |
| Partial failures | Per-item error fields in response |
| Re-render storms | Batch Redux dispatches with RAF |
| Testing complexity | Mock streaming server for tests |

### Files to Modify (When Implementing)

**Server:**
- `packages/graphql-server/src/schema.ts` - Add @stream/@defer directives
- `packages/graphql-server/src/resolvers/index.ts` - Return async iterators

**Client:**
- `src/lib/graphql/streamingClient.ts` - New: multipart parser
- `src/lib/graphql/useStreamingQuery.ts` - New: React hook
- `src/state/slices/portfolioSlice/` - Progressive upserts

---

## Sources

- [Railway Pricing](https://railway.com/pricing)
- [TanStack Query vs Apollo Comparison](https://tanstack.com/query/latest/docs/framework/react/comparison)
- [Redux to Apollo Data Access Patterns](https://www.apollographql.com/blog/redux-to-apollo-data-access-patterns)
- [Reducing Redux Code with Apollo](https://www.apollographql.com/blog/reducing-our-redux-code-with-react-apollo)
- [Apollo Cache Configuration](https://www.apollographql.com/docs/react/caching/cache-configuration)
- [Normalizing State Shape - Redux](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- [TanStack Query Persistence](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)
- [GraphQL Caching Strategies](https://www.apollographql.com/blog/caching-strategies-in-a-federated-graphql-architecture)
- [Complete Cache Strategy Guide](https://shinagawa-web.com/en/blogs/cache-strategy-optimization)
- [GraphQL @defer/@stream RFC](https://github.com/graphql/graphql-spec/blob/main/rfcs/DeferStream.md)
- [Apollo Server Incremental Delivery](https://www.apollographql.com/docs/apollo-server/workflow/defer-stream)
