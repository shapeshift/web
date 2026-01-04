# GraphQL Schema Redesign Plan

## Problem Statement

The current GraphQL schema has several issues:
1. **Flat namespace pollution** - All queries at root level (`thornodePool`, `thornodePools`, `thornodePoolBorrowers`, etc.)
2. **Deprecated fields** that should be removed (it's a PoC without backwards compatibility needs)
3. **Inconsistent patterns** - `market.*` uses proper namespace objects, but thornode/portals/cowswap don't
4. **Redundant type prefixes** - Types like `ThornodePool` are verbose when already inside a `thornode` namespace

## Design Principles

Based on GraphQL schema design best practices:
- **Namespace objects pattern** - Group related queries under logical namespaces (like `market.*` already does)
- **Remove all deprecated fields** - This is a PoC, no backwards compatibility needed
- **Keep core domain queries at root** - `accounts`, `transactions`, `marketData` are cross-cutting concerns
- **Clean type names inside namespaces** - Use `Pool` instead of `ThornodePool` when inside `thornode` namespace
- **Single `network` parameter** - `thornode` namespace handles both Thorchain and Mayachain via `network` param

---

## Proposed Schema Structure

### Query Root (Clean - 7 fields only)

```graphql
type Query {
  # Namespace objects for external data sources
  market: Market!        # (already implemented)
  thornode: Thornode!    # NEW - replaces 9 flat queries
  portals: Portals!      # NEW - replaces 3 flat queries
  cowswap: CowSwap!      # NEW - replaces limitOrders

  # Core account/transaction queries (cross-cutting, keep at root)
  accounts(accountIds: [String!]!): [AccountResult!]!
  transactions(accountIds: [String!]!, limit: Int = 50): TransactionConnection!
  marketData(assetIds: [AssetId!]!): [MarketDataResult!]!

  # Health check
  health: String!
}
```

### Thornode Namespace (Cleaned Up)

```graphql
"""
Thorchain/Mayachain data access
Use network parameter to select chain (defaults to thorchain)
"""
type Thornode {
  # Pool queries
  pool(asset: String!, network: Network = THORCHAIN): Pool
  pools(network: Network = THORCHAIN, first: Int = 100, after: String): PoolConnection!

  # Position queries
  borrowers(asset: String!, network: Network = THORCHAIN): [Borrower!]!
  savers(asset: String!, network: Network = THORCHAIN): [Saver!]!

  # Network state
  mimir(network: Network = THORCHAIN): JSON!
  block(network: Network = THORCHAIN): Block!
  inboundAddresses(network: Network = THORCHAIN): [InboundAddress!]!

  # TCY claims
  tcyClaims(addresses: [String!]!, network: Network = THORCHAIN): [TcyClaim!]!
}

enum Network {
  THORCHAIN
  MAYACHAIN
}
```

### Portals Namespace (Cleaned Up)

```graphql
"""
Portals DeFi position aggregator
"""
type Portals {
  account(chainId: ChainId!, address: String!): [Token!]!
  accounts(requests: [AccountInput!]!): [[Token!]!]!
  platforms: [Platform!]!
}

input AccountInput {
  chainId: ChainId!
  address: String!
}
```

### CowSwap Namespace

```graphql
"""
CowSwap DEX limit orders
"""
type CowSwap {
  orders(accountIds: [String!]!): [OrdersUpdate!]!
}
```

### Subscriptions (Namespaced)

```graphql
type Subscription {
  """
  Real-time limit order updates
  """
  cowswapOrdersUpdated(accountIds: [String!]!): OrdersUpdate!
}
```

---

## Type Renaming (Inside Namespaces)

### Thornode Types
| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `ThornodePool` | `Pool` | Inside `thornode` namespace, prefix redundant |
| `ThornodePoolConnection` | `PoolConnection` | Same |
| `ThornodePoolEdge` | `PoolEdge` | Same |
| `ThornodeBorrower` | `Borrower` | Same |
| `ThornodeSaver` | `Saver` | Same |
| `ThornodeBlock` | `Block` | Same |
| `ThornodeNetwork` | `Network` | Cleaner enum name |

### Portals Types
| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `PortalsToken` | `Token` | Inside `portals` namespace |
| `PortalsPlatform` | `Platform` | Same |
| `PortalsAccountInput` | `AccountInput` | Same |

### CowSwap Types
| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `CowSwapOrder` | `Order` | Inside `cowswap` namespace |

---

## Items to Remove (Deprecated/Legacy)

### Query Fields to Delete (9 total)
- `coingeckoTrending`
- `coingeckoTopMovers`
- `coingeckoRecentlyAdded`
- `coingeckoMarkets`
- `coingeckoTopMarkets`
- `coingeckoPriceHistory`
- `thornodePoolsLegacy`
- `tcyClaims` (moved to `thornode.tcyClaims`)
- `limitOrders` (moved to `cowswap.orders`)

### Types to Delete (10 total)
- `CoingeckoTrendingCoin`
- `CoingeckoMover`
- `CoingeckoTopMovers`
- `CoingeckoRecentlyAddedCoin`
- `CoingeckoMarketCap`
- `CoingeckoSortKey` (enum)
- `EvmAccountData` (legacy)
- `UtxoAccountData` (legacy)
- `CosmosAccountData` (legacy)
- `SolanaAccountData` (legacy)

### Account Fields to Delete (4 total)
- `evmData`
- `utxoData`
- `cosmosData`
- `solanaData`

---

## Files to Modify

### Server-Side (GraphQL Server Package)
| File | Changes |
|------|---------|
| `packages/graphql-server/src/schema.ts` | Complete schema restructure |
| `packages/graphql-server/src/resolvers/index.ts` | Nested resolver structure |
| `packages/graphql-server/src/datasources/thornodeService.ts` | No changes needed (just called differently) |
| `packages/graphql-server/src/datasources/portalsService.ts` | No changes needed |
| `packages/graphql-server/src/datasources/cowswapService.ts` | No changes needed |

### Client-Side Queries
| File | Changes |
|------|---------|
| `src/lib/graphql/thornodeData.ts` | Update query paths to `thornode { ... }` |
| `src/lib/graphql/tcyClaimsData.ts` | Update to `thornode { tcyClaims }` |
| `src/lib/graphql/portalsData.ts` | Update to `portals { ... }` |
| `src/lib/graphql/coingeckoData.ts` | **DELETE** - all deprecated |
| `src/lib/graphql/useLimitOrdersSubscription.ts` | Update to `cowswap` namespace |

### Generated Types
| File | Changes |
|------|---------|
| `src/lib/graphql/generated/types.ts` | Regenerate after schema changes |

---

## Migration Mapping

| Current Query | New Query |
|--------------|-----------|
| `thornodePool(asset)` | `thornode { pool(asset) }` |
| `thornodePools(...)` | `thornode { pools(...) }` |
| `thornodePoolBorrowers(asset)` | `thornode { borrowers(asset) }` |
| `thornodePoolSavers(asset)` | `thornode { savers(asset) }` |
| `thornodeMimir(...)` | `thornode { mimir(...) }` |
| `thornodeBlock(...)` | `thornode { block(...) }` |
| `thornodeInboundAddresses(...)` | `thornode { inboundAddresses(...) }` |
| `tcyClaims(addresses)` | `thornode { tcyClaims(addresses) }` |
| `portalsAccount(...)` | `portals { account(...) }` |
| `portalsAccounts(...)` | `portals { accounts(...) }` |
| `portalsPlatforms` | `portals { platforms }` |
| `limitOrders(...)` | `cowswap { orders(...) }` |

---

## Implementation Steps

### Step 1: Update schema.ts
1. Create `Thornode` namespace type with all nested queries
2. Create `Portals` namespace type
3. Create `CowSwap` namespace type
4. Rename types (remove prefixes)
5. Update `Query` to use namespace objects
6. Remove all deprecated queries and types
7. Remove deprecated fields from `Account` type

### Step 2: Update resolvers/index.ts
1. Create `Thornode` resolver with nested field resolvers
2. Create `Portals` resolver
3. Create `CowSwap` resolver
4. Query resolver returns empty objects for namespaces (resolvers are on namespace types)
5. Remove deprecated resolvers

### Step 3: Update client-side queries
1. Update `thornodeData.ts` queries
2. Update `tcyClaimsData.ts` queries
3. Update `portalsData.ts` queries
4. Delete `coingeckoData.ts` (all deprecated)
5. Update `useLimitOrdersSubscription.ts`

### Step 4: Regenerate types
```bash
cd packages/graphql-server && yarn generate
```

### Step 5: Test
1. Start GraphQL server
2. Test each namespace in GraphQL Playground
3. Test subscription works
4. Run app type-check

---

## Example Query Before/After

### Before (Flat & Verbose)
```graphql
query GetPoolData {
  thornodePool(asset: "BTC.BTC") {
    asset
    status
    balanceRune
  }
  thornodePoolBorrowers(asset: "BTC.BTC") {
    owner
    debtCurrent
    collateralCurrent
  }
  tcyClaims(addresses: ["thor1..."]) {
    asset
    amount
  }
  portalsAccount(chainId: "eip155:1", address: "0x...") {
    key
    name
    apy
  }
  limitOrders(accountIds: ["0x..."]) {
    orders {
      uid
      status
    }
  }
}
```

### After (Clean & Namespaced)
```graphql
query GetPoolData {
  thornode {
    pool(asset: "BTC.BTC") {
      asset
      status
      balanceRune
    }
    borrowers(asset: "BTC.BTC") {
      owner
      debtCurrent
      collateralCurrent
    }
    tcyClaims(addresses: ["thor1..."]) {
      asset
      amount
    }
  }
  portals {
    account(chainId: "eip155:1", address: "0x...") {
      key
      name
      apy
    }
  }
  cowswap {
    orders(accountIds: ["0x..."]) {
      orders {
        uid
        status
      }
    }
  }
}
```

---

## Benefits

1. **Discoverability** - Schema explorer shows logical groupings
2. **Reduced cognitive load** - Related queries grouped together
3. **Cleaner root Query** - 7 fields instead of 20+
4. **Consistent with market pattern** - Already using `market.*` successfully
5. **Less verbose types** - `Pool` instead of `ThornodePool` when context is clear
6. **Future extensibility** - Easy to add new queries under namespaces
7. **No deprecated cruft** - Clean slate for PoC
