# GraphQL POC - Next Steps

## Session Update (Latest)

### Completed This Session

1. **Major Schema Redesign - Namespaced Queries**
   - Implemented `market { ... }` namespace for all CoinGecko data
   - Updated `thornode { ... }` with batch queries `allBorrowers`, `allSavers`
   - Updated `Account.details` to use union type with `__typename` discriminator
   - Removed deprecated flat `coingecko*` queries from schema

2. **Client-Side Type Updates**
   - Updated `GraphQLAccount` to use `details` union instead of `evmData/utxoData/cosmosData/solanaData`
   - Fixed all consumers: `accountManagement.ts`, `accountService.ts`, `portfolioSlice.ts`, `helpers.ts`, `thorchain/index.ts`
   - Added conversion functions for legacy type compatibility

3. **Batch Pool Queries**
   - Added `thornode.allBorrowers(assets: [String!]!)` - fetch borrowers for multiple pools in single request
   - Added `thornode.allSavers(assets: [String!]!)` - fetch savers for multiple pools in single request
   - Client functions: `fetchAllPoolBorrowersGraphQL()`, `fetchAllPoolSaversGraphQL()`

4. **CoinGecko Market Data**
   - All queries now use `market { ... }` namespace
   - Updated response type handling with adapter functions for legacy compatibility
   - Functions: `fetchTrendingGraphQL`, `fetchTopMoversGraphQL`, `fetchRecentlyAddedGraphQL`, `fetchMarketsGraphQL`, `fetchTopMarketsGraphQL`

5. **GraphQL Fallback Error Handling**
   - Added try/catch with fallback to legacy APIs in savers/borrowers utilities

### Servers Running
- GraphQL: `http://localhost:4000/graphql`
- Web: `http://localhost:3000`
- Both compile and run with 0 TypeScript errors

---

## Remaining Work

### Low Priority (Future Work)

1. **Route useTransactionsSubscriber through GraphQL**
   - Currently uses direct unchained API calls for WebSocket subscription
   - Account refresh already uses GraphQL via accountService
   - Would need: GraphQL subscription for transaction events
   - Benefit: Unified subscription layer, server-side tx parsing
   - Effort: High - requires new subscription infrastructure

2. **Route useReceiveAddress through GraphQL**
   - Uses chain adapter's `getAddress()` method directly
   - Security consideration: wallet operations, address derivation
   - Would need: New GraphQL mutation for address derivation
   - Benefit: Centralized address management
   - Effort: Medium - security review needed

3. **Batch IPFS Metadata Requests**
   - RFOX epoch history fetches N requests per page load (one per epoch)
   - Current: `Promise.all()` with parallel requests (already efficient)
   - Options:
     - Lazy-load epochs (fetch recent 5, load older on scroll)
     - Backend batch endpoint if IPFS gateway supports multi-hash
     - IndexedDB caching for historical epochs
   - Effort: Medium - mostly frontend optimization

---

## Previous Session Work

1. **Limit Orders GraphQL Subscription Integration**
   - `useLimitOrders.tsx` routes through GraphQL WebSocket when `VITE_FEATURE_GRAPHQL_POC=true`
   - Real-time order updates via WebSocket instead of 15-second polling

2. **TCY Claims GraphQL Integration**
   - `useTcyClaims.tsx` skips legacy Thorchain API calls when GraphQL enabled

3. **Feature Flag Consolidation**
   - Single `VITE_FEATURE_GRAPHQL_POC` flag controls all GraphQL features

---

## Architecture Notes

### Current Schema Structure
```graphql
type Query {
  # Namespaced queries
  market: Market!
  thornode: Thornode!
  portals: Portals!
  cowswap: CowSwap!
  
  # Root queries
  marketData(assetIds: [String!]!): [MarketDataResult!]!
  accounts(accountIds: [String!]!): [Account!]!
  transactions(accountIds: [String!]!, limit: Int): TransactionConnection!
  health: String!
}

type Subscription {
  cowswapOrdersUpdated(accountIds: [String!]!): OrdersUpdate!
}
```

### Account Details Union Pattern
```graphql
union AccountDetails = 
  EvmAccountDetails | 
  UtxoAccountDetails | 
  CosmosAccountDetails | 
  SolanaAccountDetails

type Account {
  details: AccountDetails  # Use __typename to discriminate
}
```

### Client-Side Pattern
```typescript
const details = graphqlAccount.details
if (details?.__typename === 'EvmAccountDetails') {
  // TypeScript knows details has nonce, tokens
}
```

---

## Files Modified This Session

### Server-Side
- `packages/graphql-server/src/schema.ts` - Added allBorrowers, allSavers
- `packages/graphql-server/src/resolvers/index.ts` - Batch resolver implementations

### Client-Side
- `src/lib/graphql/accountData.ts` - New type definitions
- `src/lib/graphql/coingeckoData.ts` - Market namespace queries
- `src/lib/graphql/thornodeData.ts` - Batch borrowers/savers functions
- `src/lib/graphql/index.ts` - Updated exports
- `src/react-queries/queries/accountManagement.ts` - Details pattern
- `src/lib/account/accountService.ts` - Details pattern
- `src/lib/utils/thorchain/index.ts` - Details pattern
- `src/components/Modals/ManageAccounts/helpers.ts` - Details pattern
- `src/state/slices/portfolioSlice/portfolioSlice.ts` - Details pattern

---

## Backlog

- **Portals API Unauthorized (401)**: GraphQL server getting 401 from `api.portals.fi/v2/account`. Needs API key or auth headers.
