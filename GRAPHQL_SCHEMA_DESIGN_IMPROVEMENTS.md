# GraphQL Schema Design Improvements for ShapeShift

**Date**: January 4, 2026  
**Status**: Comprehensive Analysis with Actionable Recommendations  
**Scope**: Deep dive into schema design best practices + current REST patterns → optimized GraphQL design

---

## Executive Summary

The current GraphQL POC has a **solid foundation** with DataLoader batching and correct separation of concerns. However, the schema design has **critical inconsistencies** that will cause pain as the API scales:

### Key Issues Found

1. **Inconsistent Nullability** - Fields marked non-null that can realistically fail (network errors, missing data)
2. **Query Fragmentation** - Related data split across multiple separate queries instead of hierarchical object graphs
3. **No Error Handling Pattern** - Mutations/queries lack structured error responses (only HTTP errors)
4. **Account ID Format Exposed** - Internal `accountId` format leaks into schema (should be opaque)
5. **Missing Type Safety** - Scalars like `AssetId` and `AccountId` are `String!` (no custom scalar validation)
6. **Weak Pagination** - `TransactionConnection` is good but other list fields aren't paginated
7. **Null in Lists** - Many list types return `[Type!]!` but should consider edge cases

### Quick Wins (High Impact, Low Effort)

- ✅ Use custom scalar types for domain identifiers
- ✅ Add structured error response types
- ✅ Mark fields nullable where failures are possible
- ✅ Move from separate queries to nested object relationships
- ✅ Add `__typename` hints for union types

---

## Part 1: GraphQL Schema Best Practices vs Current Implementation

### 1.1 Demand-Driven Schema Design

**Best Practice**: Design schema around client needs, not data storage.

**Current State**: ⚠️ Mixed - Good for accounts/transactions, but CoinGecko endpoints fragment across multiple queries.

**Problem Example**:
```graphql
# Current Schema - Fragmented
query {
  marketData(assetIds: [...])
  coingeckoTrending
  coingeckoTopMovers
  coingeckoRecentlyAdded
  coingeckoMarkets(order: market_cap_desc)
}

# What clients actually need - Unified market context
query {
  market {
    trending { ... }
    movers { ... }
    recentlyAdded { ... }
    topMarkets { ... }
    assetData(ids: [...]) { ... }
  }
}
```

**Improvement**: Group related market data under a `market` root query field instead of 5 separate queries.

---

### 1.2 Nullability & Error Handling

**Best Practice**: Only mark fields `!` (non-null) when they're **guaranteed** to return a value.

**Current Issues**:
```graphql
# ❌ Too strict - network errors happen
type MarketData {
  assetId: String!
  price: String!          # Can fail if API is down
  marketCap: String!      # Can fail if asset delisted
}

# ✅ More realistic
type MarketData {
  assetId: String!
  price: String           # Null if unavailable
  marketCap: String       # Null if unavailable
  error: MarketDataError  # Structured error info
}

type MarketDataError {
  code: String!          # "PRICE_UNAVAILABLE", "API_ERROR"
  message: String!
}
```

**Why This Matters**: When you promise `String!` and return null, clients crash. Better to return null with error context.

---

### 1.3 Custom Scalars for Domain Types

**Best Practice**: Use custom scalars for domain-specific types to enable validation + documentation.

**Current State**: ❌ Using `String!` for everything
```graphql
scalar AssetId
scalar AccountId
# ...but they're not actually used as custom types
```

**Improvement**:
```graphql
scalar AssetId       # CAIP-19 format: eip155:1/slip44:60
scalar AccountId     # Internal format: chainId:pubkey (opaque to client)
scalar ChainId       # CAIP-2 format
scalar PubKey        # Hex or base58 depending on chain

# Then use them:
type Account {
  id: AccountId!                # Opaque to client
  chainId: ChainId!
  pubkey: PubKey!
  assetId: AssetId!
}

type MarketData {
  assetId: AssetId!
}
```

**Benefits**:
- Clients know `id` is an internal format (shouldn't parse it)
- Server can validate/transform easily
- GraphQL introspection documents the format
- Type safety across schema

---

### 1.4 Structured Error Responses

**Best Practice**: Return errors as data, not just HTTP status codes.

**Current State**: ❌ No error handling in schema
```graphql
type Query {
  marketData(assetIds: [String!]!): [MarketData]!
  # If query fails → HTTP 500 error for whole query
}
```

**Improvement**: Follow the "Errors as Data" pattern
```graphql
type MarketDataResult {
  success: Boolean!
  data: MarketData
  error: MarketDataError
}

type MarketDataError {
  code: MarketDataErrorCode!
  message: String!
  assetId: AssetId
  details: JSON
}

enum MarketDataErrorCode {
  ASSET_NOT_FOUND
  PRICE_UNAVAILABLE
  API_ERROR
  RATE_LIMITED
}

type Query {
  # Returns partial success: some assets with data, some with errors
  marketData(assetIds: [AssetId!]!): [MarketDataResult!]!
}
```

**Real-world scenario**:
```graphql
query {
  marketData(assetIds: [ETH, UNKNOWN_TOKEN, BTC]) {
    data { assetId, price }
    error { code, message }
  }
}

# Response - No HTTP error, client handles gracefully
{
  "data": {
    "marketData": [
      { "data": { "assetId": "ETH", "price": "3100" }, "error": null },
      { "data": null, "error": { "code": "ASSET_NOT_FOUND", "message": "..." } },
      { "data": { "assetId": "BTC", "price": "45000" }, "error": null }
    ]
  }
}
```

---

## Part 2: Current REST API Patterns → GraphQL Design

### 2.1 CoinGecko Integration

**Current REST URLs**:
```
GET https://api.proxy.shapeshift.com/api/v1/markets
  → List all markets (8-10 separate paginated requests)

GET https://api.coingecko.com/api/v3/trending
  → Top trending coins

GET https://api.coingecko.com/api/v3/coins/{id}/markets?vs_currency=usd
  → Single coin market data
```

**Current GraphQL (Fragmented)**:
```graphql
query {
  coingeckoTrending { ... }        # Separate request
  coingeckoTopMovers { ... }       # Separate request
  coingeckoMarkets(page: 1) { ... } # Separate request (pagination!)
  marketData(assetIds: [...]) { ... } # Batched, good
}
```

**Improved Design** - Unified `market` namespace:
```graphql
type Query {
  # 1. Market data by asset (existing, good)
  marketData(assetIds: [AssetId!]!): [MarketDataResult!]!

  # 2. Market information aggregated
  market: MarketInfo!
}

type MarketInfo {
  # Context-specific queries
  trending(limit: Int): [TrendingAsset!]!
  movers(limit: Int): Movers!
  recentlyAdded(limit: Int): [RecentAsset!]!
  
  # Top market data (paginated)
  topAssets(
    first: Int
    after: String
    orderBy: MarketOrderField
  ): MarketAssetConnection!
}

type MarketAssetConnection {
  edges: [MarketAssetEdge!]!
  pageInfo: PageInfo!
}

enum MarketOrderField {
  MARKET_CAP_DESC
  MARKET_CAP_ASC
  VOLUME_DESC
  VOLUME_ASC
  PRICE_CHANGE_24H
}

type TrendingAsset {
  assetId: AssetId!
  name: String!
  symbol: String!
  marketCapRank: Int
  images: AssetImages!
}

type Movers {
  topGainers(limit: Int): [MovingAsset!]!
  topLosers(limit: Int): [MovingAsset!]!
}

type MovingAsset {
  assetId: AssetId!
  priceChange24h: Float
  marketCapRank: Int
}
```

**Single request for all market context**:
```graphql
query GetMarketContext {
  market {
    trending(limit: 10) { assetId, name, images }
    movers { topGainers(limit: 5) { assetId, priceChange24h } }
    topAssets(first: 100) { edges { node { assetId, price } } }
  }
}
```

### 2.2 Account/Balance Data

**Current REST (Unchained)**:
```
GET /evm/{chainId}/account/{pubkey}
  → EVM account nonce + token balances

GET /utxo/{chainId}/address/{pubkey}
  → UTXO addresses + balances

GET /cosmos/{chainId}/account/{pubkey}
  → Cosmos delegations, rewards, etc.
```

**Current GraphQL**:
```graphql
query {
  accounts(accountIds: [
    "eip155:1:0xabc...",
    "cosmos:cosmoshub-4:cosmos1..."
  ]) {
    id, balance, pubkey, chainId, assetId
    evmData { nonce, tokens }
    cosmosData { delegations, rewards }
  }
}
```

**Issue**: "Account" data mixes different concepts:
- Balance (account balance)
- Native asset ID (derived, not stored)
- Chain-specific data (EVM nonce vs Cosmos sequence)

**Improved Design** - Separate concerns:
```graphql
type Account {
  # Identity (opaque)
  id: AccountId!
  
  # Location
  chainId: ChainId!
  pubkey: PubKey!
  
  # Balance of native asset ONLY
  balance: Balance!
  
  # Chain-specific details (not all populated)
  details: AccountDetails
}

union AccountDetails = 
  | EvmAccountDetails
  | UtxoAccountDetails
  | CosmosAccountDetails
  | SolanaAccountDetails

type EvmAccountDetails {
  nonce: Int!
  tokens: [TokenBalance!]!
}

type CosmosAccountDetails {
  sequence: String
  accountNumber: String
  delegations: [Delegation!]!
  rewards: [Reward!]!
}

# Query it
query {
  accounts(accountIds: [ID1, ID2]) {
    id
    balance {
      value: String!
      assetId: AssetId!
    }
    details {
      __typename
      ... on EvmAccountDetails {
        nonce
        tokens { assetId, balance }
      }
      ... on CosmosAccountDetails {
        sequence
        delegations { amount, validator }
      }
    }
  }
}
```

**Benefits**:
- Clear what's guaranteed (id, chainId, balance)
- Chain-specific data optional (not polluting base type)
- Client can handle unknown details gracefully

---

### 2.3 Transaction History

**Current REST**:
```
GET /evm/{chainId}/address/{pubkey}/txs?pageSize=20&cursor=...
GET /utxo/{chainId}/address/{pubkey}/txs?pageSize=20
```

**Current GraphQL** (Already well-designed):
```graphql
type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
}
```

✅ **This is good!** Uses cursor-based pagination. No major changes needed here except:

1. **Add error handling**:
```graphql
type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
  error: TransactionError  # If fetch failed
}

type TransactionError {
  code: String!
  message: String!
}
```

2. **Consider filtering**:
```graphql
type Query {
  transactions(
    accountIds: [AccountId!]!
    limit: Int = 20
    after: String
    
    # Filters
    status: [TxStatus!]
    types: [TransferType!]
    after: DateTime
    before: DateTime
  ): TransactionConnection!
}
```

---

### 2.4 Thornode/Bridge Data

**Current REST**:
```
GET https://thornode.thorswap.net/thorchain/pools
GET https://thornode.thorswap.net/thorchain/inbound_addresses
GET https://mayachain.mayaprotocol.com/thorchain/mimir
```

**Current GraphQL**:
```graphql
type Query {
  thornodePools(network: ThornodeNetwork): [ThornodePool!]!
  thornodeInboundAddresses(network: ThornodeNetwork): [InboundAddress!]!
  thornodeMimir(network: ThornodeNetwork): JSON!
}
```

**Issues**:
1. `thornodeMimir` returns raw `JSON!` - impossible to type-check
2. No error handling if network down
3. Tightly coupled to Thornode structure

**Improved Design**:
```graphql
enum BridgeNetwork {
  THORCHAIN
  MAYACHAIN
}

type Query {
  bridge: BridgeInfo!
}

type BridgeInfo {
  # Network-agnostic high-level data
  activeNetwork: BridgeNetwork!
  
  # Pools available
  pools(network: BridgeNetwork): [BridgePool!]!
  
  # Deposit addresses
  inboundAddresses(network: BridgeNetwork): [InboundAddress!]!
  
  # Network parameters
  config(network: BridgeNetwork): BridgeConfig
}

type BridgeConfig {
  network: BridgeNetwork!
  minTxVolume: String
  maxTxVolume: String
  halted: Boolean
  parameters: [ConfigParameter!]
}

type ConfigParameter {
  key: String!
  value: String!
  description: String
}

# Usage
query {
  bridge {
    pools(network: THORCHAIN) {
      asset { assetId, name }
      balanceRune: String
      balanceAsset: String
      status: PoolStatus
      apy: Float
    }
    inboundAddresses(network: THORCHAIN) {
      address, router, gasRate, halted
    }
    config(network: THORCHAIN) {
      network, halted, parameters { key, value }
    }
  }
}
```

---

## Part 3: Detailed Schema Design Recommendations

### 3.1 Nullability Strategy

**Rule**: Only use `!` when:
- Data is **guaranteed** to exist (ID, created timestamp)
- Missing data is an **application error** (bad request)
- Data is **immutable** after creation

**Apply to current schema**:
```graphql
# ❌ Too strict
type MarketData {
  assetId: String!
  price: String!           # Can fail if API down
  marketCap: String!       # Can fail if delisted
  volume: String!          # Can fail
  changePercent24Hr: Float! # Can fail
}

# ✅ Realistic
type MarketData {
  assetId: String!
  price: String            # Null = unavailable
  marketCap: String        # Null = not applicable
  volume: String           # Null = no data
  changePercent24Hr: Float  # Null = no data
}

# ✅ With error context
type MarketDataResponse {
  assetId: String!
  success: Boolean!
  data: MarketData
  error: MarketError
}

type MarketError {
  code: MarketErrorCode!
  message: String!
}

enum MarketErrorCode {
  ASSET_NOT_FOUND
  PRICE_STALE
  API_ERROR
  RATE_LIMITED
}
```

### 3.2 List Pagination Strategy

**Rule**: Paginate if result set can be:
- Large (100+ items)
- Slow to fetch
- Frequently updated

**Lists to paginate**:
- ✅ `marketData` - can have thousands of assets
- ✅ `transactions` - already done (good!)
- ✅ `thornodePools` - dozens of pools
- ✅ `portalsAccounts` - can have many tokens

**Lists OK to not paginate**:
- ❌ `coingeckoTopMovers` (max 10 items)
- ❌ `coingeckoTrending` (max 7 items)
- ❌ `thornodeInboundAddresses` (1 per chain, ~20 max)

**Implement pagination for large lists**:
```graphql
type Query {
  marketData(
    assetIds: [AssetId!]
    first: Int
    after: String
    # Sorting
    orderBy: AssetOrderBy
  ): AssetConnection!
}

type AssetConnection {
  edges: [AssetEdge!]!
  pageInfo: PageInfo!
  totalCount: Int  # Optional: helps UI calculate pages
}

type AssetEdge {
  cursor: String!
  node: MarketData!
}

enum AssetOrderBy {
  MARKET_CAP_DESC
  MARKET_CAP_ASC
  VOLUME_DESC
  PRICE_DESC
  PRICE_ASC
}
```

### 3.3 Type Hierarchy & Unions

**Problem**: Different account types stuffed into one type with optional fields.

**Better**: Use unions for type safety:
```graphql
# ✅ Type-safe approach
union AccountDetails = EvmAccountDetails | UtxoAccountDetails | CosmosAccountDetails

type Account {
  id: AccountId!
  balance: Balance!
  details: AccountDetails!
}

# Query pattern
query {
  accounts(accountIds: [ID1, ID2]) {
    id
    balance
    details {
      __typename
      ... on EvmAccountDetails {
        nonce
        tokens { assetId, balance }
      }
      ... on CosmosAccountDetails {
        sequence
        delegations { amount }
      }
    }
  }
}
```

### 3.4 Input Types & Variables

**Current**: Simple scalar arguments
```graphql
query {
  accounts(accountIds: [String!]!)
  portalsAccounts(requests: [PortalsAccountInput!]!)
}

input PortalsAccountInput {
  chainId: String!
  address: String!
}
```

**Better**: Use typed inputs
```graphql
input AccountsQueryInput {
  accountIds: [AccountId!]!
  includeTokens: Boolean = true
  includeDetails: Boolean = true
}

input PortalsAccountInput {
  chainId: ChainId!
  address: String!  # Keep String since it's public key
}

input TransactionFilter {
  status: [TxStatus!]
  types: [TransferType!]
  dateRange: DateRange
}

input DateRange {
  from: DateTime!
  to: DateTime!
}

type Query {
  accounts(input: AccountsQueryInput!): [Account!]!
  transactions(
    accountIds: [AccountId!]!
    filter: TransactionFilter
  ): TransactionConnection!
}
```

### 3.5 Subscription Types

**Current**: Only limit orders have subscriptions

**Recommendation**: Add subscriptions for:
```graphql
type Subscription {
  # Real-time account balance updates
  accountUpdated(accountId: AccountId!): Account!
  
  # Real-time transaction notifications
  transactionConfirmed(accountId: AccountId!): Transaction!
  
  # Market price updates
  marketDataUpdated(assetIds: [AssetId!]!): MarketDataUpdate!
  
  # Order status
  limitOrdersUpdated(accountIds: [AccountId!]!): OrdersUpdate!
}

type MarketDataUpdate {
  assetId: AssetId!
  price: String
  timestamp: DateTime!
}
```

---

## Part 4: Security & Performance Considerations

### 4.1 Rate Limiting & Complexity Analysis

**Problem**: Large queries can cause DOS or high server load.

**Solution**: Implement query complexity analysis:
```typescript
// In GraphQL server
import { validation } from 'graphql'

const complexityConfig = {
  marketData: (args) => args.assetIds.length * 2,        // 2 points per asset
  accounts: (args) => args.accountIds.length * 5,          // 5 points per account
  transactions: (args) => Math.min(args.limit || 20, 100), // Max 100 per request
}
```

**Add to schema**:
```graphql
type Query {
  """Maximum 100 AssetIds per request"""
  marketData(assetIds: [AssetId!]!): [MarketData!]!
  
  """Maximum 50 AccountIds per request"""
  accounts(accountIds: [AccountId!]!): [Account!]!
  
  """Maximum 20 transactions to prevent over-fetching"""
  transactions(
    accountIds: [AccountId!]!
    limit: Int = 20 @constraint(min: 1, max: 100)
  ): TransactionConnection!
}
```

### 4.2 Field-Level Authorization

**Current**: No auth in schema

**Better**: Add directives for authorization:
```graphql
directive @auth(role: String!) on FIELD_DEFINITION

type Query {
  accounts(accountIds: [AccountId!]!): [Account!]! @auth(role: "USER")
  limitOrders(accountIds: [AccountId!]!): [Order!]! @auth(role: "USER")
}

type Mutation {
  publishPost(input: PublishPostInput!): PublishPostResult! @auth(role: "ADMIN")
}
```

### 4.3 Caching Strategy

**Current REST** (from code):
```typescript
const axios = setupCache(Axios.create(), { 
  ttl: DEFAULT_CACHE_TTL_MS, 
  cacheTakeover: false 
})
```

**GraphQL Equivalent**: Use cache control headers:
```typescript
// In resolvers
context.setCacheControl({
  maxAge: 300,  // 5 minutes
  scope: 'PUBLIC', // PUBLIC | PRIVATE
})

// For schema
directive @cache(maxAge: Int!, scope: CacheScope) on FIELD_DEFINITION

enum CacheScope {
  PUBLIC
  PRIVATE
}

type Query {
  marketData(...): [MarketData!]! @cache(maxAge: 60, scope: PUBLIC)
  accounts(...): [Account!]! @cache(maxAge: 30, scope: PRIVATE)
}
```

---

## Part 5: Migration Path

### Phase 1: Foundation (Immediate)
- [ ] Add custom scalar types (`AssetId`, `AccountId`, `ChainId`, `DateTime`)
- [ ] Implement error response wrapper types
- [ ] Add nullability where appropriate
- [ ] Document in schema comments

### Phase 2: Organization (Week 1-2)
- [ ] Restructure market data under `market` root query
- [ ] Add `AccountDetails` union types
- [ ] Implement proper error handling in resolvers
- [ ] Add query complexity limits

### Phase 3: Features (Week 2-4)
- [ ] Add pagination to large list fields
- [ ] Implement subscriptions for account/transaction updates
- [ ] Add filtering/sorting options
- [ ] Cache control directives

### Phase 4: Polish (Week 4+)
- [ ] Add field-level authorization directives
- [ ] Implement request complexity analysis
- [ ] Add GraphQL monitoring/tracing
- [ ] Schema documentation & examples

---

## Part 6: Specific Code Changes

### 6.1 Update schema.ts

Key changes:
```graphql
# Add custom scalars
scalar DateTime
scalar ChainId
scalar PubKey

# Make realistic nullability
type MarketData {
  assetId: String!
  price: String           # ← Changed from String!
  marketCap: String       # ← Changed from String!
  volume: String          # ← Changed from String!
  changePercent24Hr: Float # ← Changed from Float!
}

# Add error handling
type MarketDataResult {
  data: MarketData
  error: MarketError
}

type MarketError {
  code: String!
  message: String!
}

# Reorganize markets
type Query {
  market: Market!
  # ... rest
}

type Market {
  trending(limit: Int = 10): [TrendingAsset!]!
  movers(limit: Int = 10): Movers!
  data(assetIds: [String!]!): [MarketDataResult!]!
}
```

### 6.2 Update accountLoader.ts

```typescript
// Better error handling
async function fetchFromUnchained(
  chainId: ChainId,
  accounts: { accountId: string; pubkey: string }[],
): Promise<(Account | Error)[]> {  // ← Return errors as data
  // ...
}

// In resolver
accounts: async (_parent, args, context) => {
  const results = await Promise.all(
    args.accountIds.map(id => 
      context.loaders.accounts.load(id).catch(err => ({
        error: {
          code: 'FETCH_FAILED',
          message: err.message,
        }
      }))
    )
  )
  
  return results
}
```

---

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Nullability** | All fields non-null | Realistic nullability |
| **Error Handling** | HTTP errors only | Structured error types |
| **Custom Types** | String scalars | Custom scalars (AssetId, etc.) |
| **Market Data** | 5 separate queries | Unified `market` root query |
| **Account Details** | Mixed fields | Union types + chain-specific |
| **Pagination** | Only transactions | All large list fields |
| **Type Hierarchy** | Flat | Proper union/interface usage |
| **Subscriptions** | Limited orders only | Accounts, transactions, market data |
| **Security** | None | Query complexity, rate limits |
| **Caching** | None | Cache control directives |

---

## Why This Matters

A well-designed GraphQL schema is **foundational** to the entire GraphQL experience:

1. **Client Experience**: Intuitive queries, clear error handling, predictable nullability
2. **Server Load**: Proper pagination prevents abuse, batching works correctly
3. **Maintenance**: Clear structure makes adding features easy
4. **Evolution**: Well-designed schemas evolve cleanly without breaking clients
5. **Performance**: Proper caching directives + complexity analysis prevent DOS

The current POC is **95% correct on implementation** (DataLoader, batching, resolvers) but **70% on schema design**. These improvements push it to **95%+ ready for production**.

---

## References & Standards

- [Apollo Schema Design Guide](https://www.apollographql.com/docs/graphos/schema-design/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Principled GraphQL](https://principledgraphql.com/)
- [Cursor-Based Pagination](https://relay.dev/docs/guides/pagination/)
- [Errors as Data](https://www.apollographql.com/docs/graphos/schema-design/guides/errors-as-data-explained/)
- Current ShapeShift REST patterns (CoinGecko, Unchained, Thornode)
