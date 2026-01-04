# GraphQL Schema Improvements - Quick Reference

## TL;DR Changes

### 1. Custom Scalars (10 min implementation)
```graphql
# ADD these to schema.ts
scalar DateTime
scalar ChainId
scalar AssetId      # CAIP-19
scalar AccountId    # Opaque internal format
scalar PubKey       # Hex or base58
```

**Why**: Type safety + documentation. Clients know not to parse `AccountId`.

---

### 2. Fix Nullability (15 min)
```graphql
# CHANGE FROM
type MarketData {
  price: String!
  marketCap: String!
  volume: String!
}

# CHANGE TO
type MarketData {
  price: String       # Null = API down / asset delisted
  marketCap: String
  volume: String
}
```

**Why**: Prevents client crashes when data unavailable.

---

### 3. Add Error Handling (20 min)
```graphql
# ADD these
type MarketDataResult {
  data: MarketData
  error: MarketError
}

type MarketError {
  code: String!       # "PRICE_UNAVAILABLE", "API_ERROR"
  message: String!
  assetId: AssetId
}

# CHANGE
query {
  marketData(assetIds: [...]): [MarketData!]!  # ❌ Old
  marketData(assetIds: [...]): [MarketDataResult!]!  # ✅ New
}
```

**Why**: Client can handle partial failures gracefully.

---

### 4. Unify Market Queries (30 min)
```graphql
# ADD
type Query {
  market: Market!
}

type Market {
  trending(limit: Int): [TrendingAsset!]!
  movers(limit: Int): Movers!
  topAssets(first: Int, after: String): AssetConnection!
  data(assetIds: [AssetId!]!): [MarketDataResult!]!
}

# DEPRECATE (old queries still work for backwards compat)
type Query {
  coingeckoTrending @deprecated(reason: "Use market.trending instead")
  coingeckoTopMovers @deprecated(reason: "Use market.movers instead")
}
```

**Why**: Single query for all market context. Easier for client to use.

---

### 5. Type-Safe Account Details (25 min)
```graphql
# ADD unions
union AccountDetails = 
  | EvmAccountDetails 
  | UtxoAccountDetails 
  | CosmosAccountDetails

type EvmAccountDetails {
  nonce: Int!
  tokens: [TokenBalance!]!
}

type CosmosAccountDetails {
  sequence: String
  delegations: [Delegation!]!
  rewards: [Reward!]!
}

# CHANGE Account type
type Account {
  id: AccountId!
  balance: Balance!
  chainId: ChainId!
  pubkey: PubKey!
  
  # ❌ Remove these optional fields:
  # evmData: EvmAccountData
  # cosmosData: CosmosAccountData
  # utxoData: UtxoAccountData
  
  # ✅ Add union instead:
  details: AccountDetails
}
```

**Why**: Type safety. Clients know exactly what fields exist for each chain.

---

### 6. Paginate Large Lists (15 min)
```graphql
# thornodePools currently returns [ThornodePool!]!
# ADD pagination wrapper

type ThornodePoolConnection {
  edges: [ThornodePoolEdge!]!
  pageInfo: PageInfo!
}

type ThornodePoolEdge {
  cursor: String!
  node: ThornodePool!
}

# CHANGE
type Query {
  thornodePools(network: ThornodeNetwork): [ThornodePool!]!  # ❌ Old

  thornodePools(
    network: ThornodeNetwork
    first: Int = 50
    after: String
  ): ThornodePoolConnection!  # ✅ New
}
```

**Why**: Supports future growth without breaking API.

---

### 7. Add Validation Comments (5 min)
```graphql
type Query {
  """
  Fetches market data for specified assets
  
  **Limits**: Maximum 100 AssetIds per request
  
  **Errors**: Partial failures return results with error field populated
  
  **Caching**: Results cached for 60 seconds
  """
  marketData(assetIds: [AssetId!]!): [MarketDataResult!]!
  
  """
  Fetches account data by ID
  
  **Limits**: Maximum 50 AccountIds per request
  
  **Note**: Returns union type for details - use __typename to check
  """
  accounts(accountIds: [AccountId!]!): [Account!]!
}
```

**Why**: Clients see limits + usage patterns in GraphQL introspection.

---

## Implementation Priority Matrix

| Change | Effort | Impact | Priority |
|--------|--------|--------|----------|
| Custom scalars | 10m | High | 🔴 P1 |
| Nullability fixes | 15m | High | 🔴 P1 |
| Error handling types | 20m | High | 🔴 P1 |
| Market unification | 30m | Medium | 🟡 P2 |
| Account union types | 25m | Medium | 🟡 P2 |
| Pagination wrappers | 15m | Medium | 🟡 P2 |
| Validation comments | 5m | Low | 🟢 P3 |

**P1 = Do before shipping** (50 min total)  
**P2 = Do before scaling** (70 min total)  
**P3 = Nice to have** (5 min)

---

## Before/After Code Examples

### Example 1: Market Data Query

**BEFORE**:
```graphql
query {
  coingeckoTrending { id, name, symbol }
  coingeckoTopMovers { topGainers { id, priceChangePercentage24h } }
  marketData(assetIds: ["ETH", "BTC"]) {
    assetId, price, marketCap
  }
}
```

**AFTER**:
```graphql
query {
  market {
    trending { assetId, name }
    movers { topGainers { assetId, priceChange24h } }
    data(assetIds: ["ETH", "BTC"]) {
      data { assetId, price, marketCap }
      error { code, message }
    }
  }
}
```

**Client code difference**:
```typescript
// BEFORE: Handle errors per query
const {data: trending} = useQuery(COINGECKO_TRENDING, {})
const {data: movers} = useQuery(COINGECKO_MOVERS, {})
const {data: marketData} = useQuery(MARKET_DATA, {})

// AFTER: All market data in one query, errors inline
const {data: market} = useQuery(GET_MARKET_CONTEXT, {})
market.data.forEach(result => {
  if (result.error) console.warn(`${result.error.code}: ${result.error.message}`)
})
```

---

### Example 2: Account Details Query

**BEFORE**:
```graphql
query {
  accounts(accountIds: ["eip155:1:0xabc", "cosmos:cosmos1:xyz"]) {
    id, balance, pubkey, chainId
    # What fields are here depends on chain:
    evmData { nonce, tokens }
    cosmosData { sequence, delegations }
    utxoData { addresses }
  }
}
```

**Client code**: Check nullness of chain-specific fields
```typescript
const account = accounts[0]
if (account.evmData) {
  // It's EVM
} else if (account.cosmosData) {
  // It's Cosmos
}
```

**AFTER**:
```graphql
query {
  accounts(accountIds: ["eip155:1:0xabc", "cosmos:cosmos1:xyz"]) {
    id, balance, pubkey, chainId
    details {
      __typename
      ... on EvmAccountDetails {
        nonce, tokens { assetId, balance }
      }
      ... on CosmosAccountDetails {
        sequence, delegations { amount, validator }
      }
    }
  }
}
```

**Client code**: GraphQL fragments handle type dispatch
```typescript
const account = accounts[0]
// GraphQL validates details match __typename
// TypeScript types are automatic from fragments
switch (account.details.__typename) {
  case 'EvmAccountDetails':
    // account.details.nonce is guaranteed to exist
    break
  case 'CosmosAccountDetails':
    // account.details.sequence is guaranteed to exist
    break
}
```

---

## Backwards Compatibility

**Key principle**: Add new, deprecate old.

```graphql
# Keep old queries working
type Query {
  # New unified approach
  market: Market!
  
  # Old approach (deprecated but still works)
  coingeckoTrending: [CoingeckoTrendingCoin!]! 
    @deprecated(reason: "Use market.trending instead")
  coingeckoTopMovers: CoingeckoTopMovers! 
    @deprecated(reason: "Use market.movers instead")
  coingeckoMarkets: [CoingeckoMarketCap!]! 
    @deprecated(reason: "Use market.topAssets instead")
}

# Deprecate optional fields on Account
type Account {
  # Old way
  evmData: EvmAccountData 
    @deprecated(reason: "Use details field with union type instead")
  cosmosData: CosmosAccountData 
    @deprecated(reason: "Use details field with union type instead")
  
  # New way
  details: AccountDetails
}
```

**Benefits**:
- Existing clients continue working
- GraphQL IDEs warn about deprecated fields
- Easy migration path (clients can upgrade at their pace)

---

## Rollout Plan

### Week 1: Foundation
- [ ] Add custom scalar types
- [ ] Fix nullability
- [ ] Add error handling types
- [ ] Update client queries to use error handling
- [ ] Run `yarn type-check` to validate

### Week 2: Organization
- [ ] Refactor market queries under unified root
- [ ] Add account union types
- [ ] Deprecate old queries
- [ ] Update client to use new queries

### Week 3+: Polish
- [ ] Add pagination wrappers as needed
- [ ] Add schema documentation comments
- [ ] Performance tuning (caching directives)
- [ ] Monitor client errors → improve schema

---

## Testing Schema Changes

```bash
# 1. Run introspection to validate schema
curl -s http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{__schema{types{name}}}"}'

# 2. Test custom scalars
curl -s http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { marketData(assetIds: [\"eip155:1/slip44:60\"]) { data { assetId price } error { code } } }"
  }'

# 3. Type generation
yarn graphql:codegen

# 4. Validate generated types
yarn type-check
```

---

## Risk Mitigation

**Risk**: Breaking existing client queries  
**Mitigation**: Use deprecation directives, run migrations gradually

**Risk**: Performance degradation with new error handling  
**Mitigation**: Profile queries, error handling is just additional fields (minimal overhead)

**Risk**: Client confusion with union types  
**Mitigation**: Clear documentation, provide TypeScript fragments

---

## Summary

These changes transform the schema from **internally-focused** (exposing data structure) to **client-focused** (exposing client needs).

**Impact**:
- ✅ Better error handling (structured errors)
- ✅ Better type safety (union types, custom scalars)
- ✅ Better API design (unified market root, realistic nullability)
- ✅ Future-proof (pagination ready, easy to extend)
- ✅ Backwards compatible (deprecate, not delete)

**Timeline**: ~2-3 weeks to full implementation  
**Client Impact**: Minimal (mostly additive, graceful deprecation)
