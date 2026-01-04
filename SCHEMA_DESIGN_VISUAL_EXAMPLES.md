# GraphQL Schema Design - Visual Before/After

## Example 1: Market Data Context

### ❌ BEFORE: Fragmented Query Pattern
```graphql
query GetMarketContext {
  # Query 1
  coingeckoTrending {
    id
    name
    symbol
    marketCapRank
    thumb
  }
  
  # Query 2
  coingeckoTopMovers {
    topGainers {
      id
      priceChangePercentage24h
      marketCap
    }
    topLosers {
      id
      priceChangePercentage24h
    }
  }
  
  # Query 3
  coingeckoRecentlyAdded {
    id
    name
    symbol
  }
  
  # Query 4 (paginated, makes multiple requests)
  coingeckoMarkets(order: market_cap_desc, page: 1) {
    id
    currentPrice
    marketCap
  }
  
  # Query 5
  marketData(assetIds: ["eth", "btc"]) {
    assetId
    price
    marketCap
  }
}
```

**Problems**:
- 5 separate root queries
- Inconsistent naming (`coingecko*` vs `market*`)
- `coingeckoMarkets` pagination requires multiple requests
- No error handling - if any query fails, whole thing fails
- Client must coordinate these 5 queries

---

### ✅ AFTER: Unified Query Pattern
```graphql
query GetMarketContext {
  market {
    # One parent query!
    
    trending(limit: 10) {
      assetId
      name
      symbol
      marketCapRank
      images {
        small
        large
      }
    }
    
    movers(limit: 10) {
      topGainers {
        assetId
        priceChange24h
      }
      topLosers {
        assetId
        priceChange24h
      }
    }
    
    recentlyAdded(limit: 10) {
      assetId
      name
      symbol
      activatedAt
    }
    
    topAssets(first: 100, orderBy: MARKET_CAP_DESC) {
      edges {
        cursor
        node {
          assetId
          price
          marketCap
          volume24h
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    
    data(assetIds: ["eth", "btc"]) {
      data {
        assetId
        price
        marketCap
      }
      error {
        code
        message
      }
    }
  }
}
```

**Benefits**:
- ✅ Single `market` parent query
- ✅ Consistent structure
- ✅ Pagination built-in (`topAssets` connection)
- ✅ Error handling inline
- ✅ Easy to add more market data (extend `Market` type)
- ✅ Client loads all market context in one request

---

## Example 2: Account Data Type Safety

### ❌ BEFORE: Optional Field Soup
```graphql
query GetAccounts {
  accounts(accountIds: ["eip155:1:0xabc...", "cosmos:cosmos1:..."]) {
    id
    balance
    pubkey
    chainId
    assetId
    tokens {
      assetId
      balance
    }
    # Which of these exist depends on chain?
    evmData {
      nonce
      tokens {
        assetId
        balance
        name
        symbol
      }
    }
    utxoData {
      addresses {
        pubkey
        balance
      }
      nextChangeAddressIndex
      nextReceiveAddressIndex
    }
    cosmosData {
      sequence
      accountNumber
      delegations
      redelegations
      undelegations
      rewards
    }
    solanaData {
      tokens {
        assetId
        balance
      }
    }
  }
}
```

**Problems**:
- Client must check: `if (account.evmData) { ... } else if (account.cosmosData) { ... }`
- TypeScript doesn't know which fields are available for which chain
- All fields returned even if not needed
- Hard to extend - adding new chain requires modifying Account type

**Client code**:
```typescript
const account = accounts[0]

// 🤮 Ugly runtime checks
let nonce: number | undefined
if (account.evmData) {
  nonce = account.evmData.nonce
} else if (account.solanaData) {
  // Solana doesn't have nonce
}

// 🤮 Need to ask: does utxoData have "tokens"?
if (account.utxoData?.addresses) {
  // ...
}

// TypeScript can't help - everything is optional/any
const tokens = account.tokens || account.evmData?.tokens || account.solanaData?.tokens
```

---

### ✅ AFTER: Union Type Safety
```graphql
query GetAccounts {
  accounts(accountIds: ["eip155:1:0xabc...", "cosmos:cosmos1:..."]) {
    id
    balance
    pubkey
    chainId
    
    details {
      __typename
      ... on EvmAccountDetails {
        nonce
        tokens {
          assetId
          balance
          name
          symbol
        }
      }
      ... on UtxoAccountDetails {
        addresses {
          pubkey
          balance
        }
        nextChangeAddressIndex
        nextReceiveAddressIndex
      }
      ... on CosmosAccountDetails {
        sequence
        accountNumber
        delegations {
          amount
          validator {
            address
            moniker
          }
        }
        rewards {
          amount
          validator {
            address
          }
        }
      }
      ... on SolanaAccountDetails {
        tokens {
          assetId
          balance
        }
      }
    }
  }
}
```

**Benefits**:
- ✅ `__typename` tells you which type it is
- ✅ GraphQL fragments validate fields exist for that type
- ✅ TypeScript knows exactly which fields are available
- ✅ No null-checking pollution
- ✅ Easy to add new chain - just add new union member

**Client code** (TypeScript + graphql-codegen):
```typescript
import { GetAccountsQuery, EvmAccountDetailsFragment } from './generated'

const account: GetAccountsQuery['accounts'][0] = ...

// TypeScript ENFORCES the __typename check!
switch (account.details.__typename) {
  case 'EvmAccountDetails':
    // TypeScript knows details is EvmAccountDetails here
    console.log(account.details.nonce)  // ✅ Type-safe!
    break
    
  case 'CosmosAccountDetails':
    // TypeScript knows details is CosmosAccountDetails
    console.log(account.details.sequence)  // ✅ Type-safe!
    // account.details.nonce doesn't exist here - TS error!
    break
}

// Or use fragments for nested queries:
const evmAccount = getEvmAccountDetails(account.details)
```

---

## Example 3: Error Handling

### ❌ BEFORE: HTTP Errors Only
```graphql
query GetMarketData {
  marketData(assetIds: ["eth", "btc", "invalid-token"]) {
    assetId
    price
    marketCap
  }
}
```

**Response** (if any asset fails):
```json
{
  "errors": [
    {
      "message": "Error fetching market data: API rate limited"
    }
  ]
}
```

**Problems**:
- ❌ Entire query fails (HTTP 500)
- ❌ Client can't tell which assets failed
- ❌ No way to get partial results
- ❌ No error codes for programmatic handling
- ❌ Client has to retry entire request

---

### ✅ AFTER: Structured Errors as Data
```graphql
query GetMarketData {
  marketData(assetIds: ["eth", "btc", "invalid-token"]) {
    assetId
    success
    data {
      price
      marketCap
      volume
    }
    error {
      code
      message
      retryable
    }
  }
}
```

**Response** (partial success):
```json
{
  "data": {
    "marketData": [
      {
        "assetId": "eth",
        "success": true,
        "data": {
          "price": "3100.00",
          "marketCap": "373000000000"
        },
        "error": null
      },
      {
        "assetId": "btc",
        "success": true,
        "data": {
          "price": "45000.00",
          "marketCap": "880000000000"
        },
        "error": null
      },
      {
        "assetId": "invalid-token",
        "success": false,
        "data": null,
        "error": {
          "code": "ASSET_NOT_FOUND",
          "message": "Asset 'invalid-token' not found in CoinGecko",
          "retryable": false
        }
      }
    ]
  }
}
```

**Benefits**:
- ✅ Query succeeds (HTTP 200)
- ✅ Client knows exactly which assets failed
- ✅ Can get partial results
- ✅ Error codes for programmatic handling
- ✅ Clients can retry only failed assets

**Client code**:
```typescript
const result = await client.query(GET_MARKET_DATA)

result.marketData.forEach(item => {
  if (item.success) {
    updatePrice(item.assetId, item.data.price)
  } else {
    if (item.error.code === 'RATE_LIMITED' && item.error.retryable) {
      scheduleRetry(item.assetId)  // Retry later
    } else {
      logError(`${item.assetId}: ${item.error.message}`)
    }
  }
})
```

---

## Example 4: Pagination

### ❌ BEFORE: No Pagination
```graphql
query {
  thornodePools(network: THORCHAIN) {
    asset
    status
    balanceRune
    balanceAsset
    apy
  }
}
```

**Issues**:
- ❌ Returns all pools at once (could be 100+ items)
- ❌ No cursor-based pagination
- ❌ Hard to implement infinite scroll
- ❌ Memory issues if data grows

---

### ✅ AFTER: Cursor-Based Pagination
```graphql
query {
  pools(
    network: THORCHAIN
    first: 20
    after: "cursor-from-previous-request"
  ) {
    edges {
      cursor
      node {
        asset
        status
        balanceRune
        balanceAsset
        apy
      }
    }
    pageInfo {
      hasNextPage
      endCursor
      startCursor
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "pools": {
      "edges": [
        {
          "cursor": "bm9kZTo1",
          "node": {
            "asset": "BNB.BUSD",
            "apy": "0.125"
          }
        },
        ...
      ],
      "pageInfo": {
        "hasNextPage": true,
        "endCursor": "bm9kZToyNQ=="
      }
    }
  }
}
```

**Client code** (with React Query):
```typescript
const usePools = (network: Network) => {
  const [pools, setPools] = useState([])
  const [cursor, setCursor] = useState<string | null>(null)

  const { isLoading, hasNextPage } = useQuery({
    queryKey: ['pools', network, cursor],
    queryFn: async () => {
      const result = await client.query(GET_POOLS, {
        network,
        after: cursor,
        first: 20,
      })
      
      setPools(prev => [...prev, ...result.edges.map(e => e.node)])
      setCursor(result.pageInfo.endCursor)
      return result
    },
  })

  return {
    pools,
    isLoading,
    hasMore: hasNextPage,
    loadMore: () => /* triggers new query with cursor */,
  }
}
```

---

## Example 5: Custom Scalars

### ❌ BEFORE: String Scalars
```graphql
type Query {
  marketData(assetIds: [String!]!): [MarketData!]!
  accounts(accountIds: [String!]!): [Account!]!
  transactions(
    accountIds: [String!]!
    after: String
  ): TransactionConnection!
}

type Account {
  id: String!
  chainId: String!
  assetId: String!
  pubkey: String!
}
```

**Problems**:
- ❌ All strings - client doesn't know format
- ❌ Can't validate IDs on server side
- ❌ Client might parse internal IDs (breaking change risk)
- ❌ No documentation of format in schema

---

### ✅ AFTER: Custom Scalars
```graphql
scalar AssetId       # Documented: CAIP-19 format (eip155:1/slip44:60)
scalar AccountId     # Documented: Opaque internal format (chainId:pubkey)
scalar ChainId       # Documented: CAIP-2 format (eip155:1)
scalar PubKey        # Documented: Hex or base58 depending on chain
scalar DateTime      # ISO 8601

type Query {
  marketData(assetIds: [AssetId!]!): [MarketData!]!
  accounts(accountIds: [AccountId!]!): [Account!]!
  transactions(
    accountIds: [AccountId!]!
    after: String
  ): TransactionConnection!
}

type Account {
  id: AccountId!      # Client knows this is opaque, won't parse it
  chainId: ChainId!   # Client knows the format
  assetId: AssetId!
  pubkey: PubKey!
}

type MarketData {
  assetId: AssetId!
  price: String
  updatedAt: DateTime!
}
```

**In GraphQL introspection**:
```json
{
  "scalars": [
    {
      "name": "AssetId",
      "description": "CAIP-19 asset identifier (e.g., eip155:1/slip44:60)"
    },
    {
      "name": "AccountId",
      "description": "Opaque internal account identifier. Do not parse or assume format."
    }
  ]
}
```

**Client benefits**:
- ✅ Knows not to parse internal IDs
- ✅ Can validate format before sending
- ✅ Better IDE autocomplete
- ✅ Schema self-documents

---

## Side-by-Side Comparison

| Aspect | ❌ Before | ✅ After |
|--------|---------|----------|
| **Market Queries** | 5 separate queries | 1 unified `market` root |
| **Account Details** | 5 optional fields | 1 union type with `__typename` |
| **Error Handling** | HTTP errors | Structured error objects |
| **Nullability** | Overly strict (`!`) | Realistic nullability |
| **Pagination** | None | Cursor-based, all lists |
| **Type Safety** | String scalars | Custom domain scalars |
| **API Contracts** | No documentation | Description fields |
| **Extensibility** | Hard (modify Account) | Easy (add union member) |
| **Client Code** | Lots of null checks | Type-safe fragments |
| **Backwards Compat** | N/A | Deprecation directives |

---

## Migration Timeline

```
Week 1 - Foundation (45 min total)
├─ Add custom scalars
├─ Fix nullability
└─ Add error wrapper types

Week 2 - Organization (70 min total)
├─ Unify market queries
├─ Account union types
└─ Pagination wrappers

Week 3 - Polish
└─ Documentation + monitoring
```

Each phase is backwards-compatible, so clients can migrate gradually.
