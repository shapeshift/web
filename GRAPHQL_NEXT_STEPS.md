# GraphQL POC - Next Steps

## FIRST THING TOMORROW

**Analyze `~/Downloads/graphql.har`** - There are still raw HTTP and account calls happening despite GraphQL being enabled. Need to:
1. Identify all endpoints still making direct calls
2. Route them through GraphQL
3. Ensure DataLoader batching is working

---

## Completed This Session

1. **Limit Orders GraphQL Subscription Integration**
   - `useLimitOrders.tsx` now routes through GraphQL WebSocket subscription when `VITE_FEATURE_GRAPHQL_POC=true`
   - Uses `skipToken` pattern to prevent RTK Query polling when GraphQL is active
   - Real-time order updates via WebSocket instead of 15-second polling

2. **TCY Claims GraphQL Integration**
   - `useTcyClaims.tsx` skips legacy Thorchain API calls when GraphQL enabled
   - Empty queries array passed to `useSuspenseQueries` to prevent any fetching

3. **Feature Flag Consolidation** (previous session)
   - Single `VITE_FEATURE_GRAPHQL_POC` flag controls all GraphQL features

## Remaining Work

### High Priority

1. **Thorchain Borrowers/Savers GraphQL Integration**
   - `getAllThorchainLendingPositions()` and `getThorchainLendingPosition()` in `src/lib/utils/thorchain/lending/index.ts` still make direct axios calls
   - These are utility functions, not hooks - need refactor to support conditional GraphQL
   - GraphQL server already has `thornodePoolBorrowers` and `thornodePoolSavers` endpoints
   - Options:
     - Create wrapper hooks that conditionally use GraphQL
     - Pass feature flag down through call chain
     - Create GraphQL client functions alongside existing axios ones

2. **Transaction Subscriptions (`subscribeTxs`)**
   - `useTransactionsSubscriber.ts` uses direct unchained API calls
   - Should leverage GraphQL subscriptions for real-time tx updates
   - Would significantly reduce polling overhead

### Medium Priority

3. **Portals Integration Testing**
   - Portals GraphQL client exists but needs verification
   - Ensure `fetchPortalsAccountGraphQL` is being used when flag enabled

4. **Client-Side Savers/Borrowers Queries**
   - GraphQL schema has `thornodePoolSavers` and `thornodePoolBorrowers`
   - Need client-side hooks to consume these endpoints

5. **Error Handling & Fallback**
   - Add automatic fallback to legacy APIs on GraphQL failures
   - Similar to `shouldUseLegacyFallback` pattern in market data

### Low Priority

6. **Performance Benchmarking**
   - Compare batched GraphQL requests vs direct API calls
   - Measure WebSocket subscription overhead vs polling

7. **Subscription Filtering**
   - Filter subscription updates by accountId server-side
   - Currently all updates go to all subscribers

## Architecture Notes

### Current Data Flow (with GraphQL enabled)
```
Component
  └── useLimitOrdersQuery()
        ├── [GraphQL ON]  → useLimitOrdersSubscription() → WebSocket → GraphQL Server → CowSwap API
        └── [GraphQL OFF] → useGetLimitOrdersQuery() → RTK Query polling → CowSwap API
```

### Files Modified
- `src/components/MultiHopTrade/components/LimitOrder/hooks/useLimitOrders.tsx`
- `src/pages/TCY/queries/useTcyClaims.tsx`

### Related Files (need work)
- `src/lib/utils/thorchain/lending/index.ts` - borrowers/savers utilities
- `src/hooks/useTransactionsSubscriber.ts` - tx subscriptions
- `src/lib/graphql/` - GraphQL client utilities
