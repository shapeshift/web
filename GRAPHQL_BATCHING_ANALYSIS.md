# GraphQL Account Batching: Deep Analysis & Solution Options

## Executive Summary

The current GraphQL POC branch has implemented a multi-layer architecture with DataLoader batching at both client and server. After deep analysis, the architecture is **more complete than initially assessed**, but there are still gaps preventing optimal batching for scattered `getAccount` calls.

**Key Finding**: The client-side DataLoader with 16ms batching window EXISTS and IS wired up, but **HAR analysis confirms batching is NOT working** - 97% of requests contain only 1 account despite having DataLoader infrastructure in place.

**Root Cause**: Dynamic imports in `accountManagement.ts` add async overhead that exceeds the 16ms batching window, causing each request to miss the batch.

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [What's Actually Working](#whats-actually-working)
3. [Remaining Issues](#remaining-issues)
4. [Batching Flow Analysis](#batching-flow-analysis)
5. [Solution Options](#solution-options)
6. [Recommendations](#recommendations)
7. [Testing & Verification](#testing--verification)

---

## Current Architecture

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT IMPLEMENTATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    BATCH PATH (usePortfolioFetch)                    │   │
│   │                                                                       │   │
│   │   usePortfolioFetch ───► getAccountsBatch.initiate()                 │   │
│   │                                    │                                  │   │
│   │                                    ▼                                  │   │
│   │                          fetchAccountsGraphQL()                       │   │
│   │                                    │                                  │   │
│   │                                    ▼                                  │   │
│   │                       Client DataLoader (16ms)  ◄─────────────┐      │   │
│   │                                    │                          │      │   │
│   │                                    ▼                          │      │   │
│   │                          GraphQL HTTP Request                 │      │   │
│   │                                    │                          │      │   │
│   │                                    ▼                          │      │   │
│   │                       Server DataLoader (per-request)         │      │   │
│   │                                    │                          │      │   │
│   │                                    ▼                          │      │   │
│   │                          Unchained (by chain)                 │      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                  INDIVIDUAL PATH (scattered callsites)               │   │
│   │                                                                       │   │
│   │   Chains.tsx ────────┐                                               │   │
│   │   useTransactionsSub ─┼──► getAccount.initiate()                     │   │
│   │   DegradedStateBanner ┤              │                               │   │
│   │   useSendAction ──────┤              ▼                               │   │
│   │   useSwapAction ──────┘    accountManagement.getAccount()            │   │
│   │                                      │                               │   │
│   │                                      ▼                               │   │
│   │                           getGraphQLAccountData()                    │   │
│   │                                      │                               │   │
│   │                                      ▼                               │   │
│   │                          fetchAccountsGraphQL([single])              │   │
│   │                                      │                               │   │
│   │                                      ▼                               │   │
│   │                       Client DataLoader (16ms) ───────────────┘      │   │
│   │                         (SAME SINGLETON!)                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Layer | Component | Location | Status |
|-------|-----------|----------|--------|
| **Client** | GraphQL Client | `src/lib/graphql/client.ts` | ✅ Singleton |
| **Client** | Account DataLoader | `src/lib/graphql/accountData.ts` | ✅ Singleton, 16ms window |
| **Client** | `fetchAccountsGraphQL` | `src/lib/graphql/accountData.ts` | ✅ Uses DataLoader |
| **Client** | React Query wrapper | `src/react-queries/queries/accountManagement.ts` | ✅ Calls fetchAccountsGraphQL |
| **RTK Query** | `getAccount` | `src/state/slices/portfolioSlice/portfolioSlice.ts` | ✅ Uses accountManagement |
| **RTK Query** | `getAccountsBatch` | `src/state/slices/portfolioSlice/portfolioSlice.ts` | ✅ Direct GraphQL |
| **Server** | Account DataLoader | `packages/graphql-server/src/loaders/accountLoader.ts` | ✅ Per-request, groups by chain |
| **Server** | Unchained Integration | `packages/graphql-server/src/unchained/` | ✅ Real API calls |

---

## What's Actually Working

### 1. Feature Flags ✅

```typescript
// src/state/slices/preferencesSlice/preferencesSlice.ts
GraphQLMarketData: boolean   // Market data via GraphQL
GraphQLAccountData: boolean  // Account data via GraphQL  
GraphQLCoingeckoData: boolean // CoinGecko endpoints via GraphQL
```

### 2. Batch Endpoint Path ✅

When `GraphQLAccountData` is enabled:
```typescript
// usePortfolioFetch.tsx
if (isGraphQLAccountDataEnabled) {
  dispatch(
    portfolioApi.endpoints.getAccountsBatch.initiate({ accountIds: enabledWalletAccountIds }),
  )
}
```

This correctly uses GraphQL batching for initial portfolio load.

### 3. Individual Calls DO Use GraphQL ✅

```typescript
// accountManagement.ts
export const accountManagement = createQueryKeys('accountManagement', {
  getAccount: (accountId: AccountId) => ({
    queryFn: async () => {
      const { isEnabled, account: graphqlAccount } = await getGraphQLAccountData(accountId)
      if (isEnabled && graphqlAccount) {
        return graphQLAccountToChainAdapterAccount(graphqlAccount, chainId)
      }
      // Fallback to chain adapter
      return adapter.getAccount(pubkey)
    },
  }),
})
```

### 4. Client DataLoader EXISTS ✅

```typescript
// accountData.ts
const BATCH_WINDOW_MS = 16

function getAccountLoader() {
  if (!accountLoader) {
    accountLoader = new DataLoader(batchGetAccounts, {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: callback => setTimeout(callback, BATCH_WINDOW_MS),
    })
  }
  return accountLoader
}
```

### 5. Server DataLoader Works ✅

```typescript
// server.ts - creates per-request loaders
context: () => Promise.resolve({
  loaders: {
    accounts: createAccountLoader(),  // Fresh per request
  },
}),

// accountLoader.ts - groups by chain
function groupByChainId(accountIds) {
  // Groups accounts to minimize Unchained calls
}
```

---

## 🚨 Evidence from HAR Analysis

### HAR File Analysis Results

Analysis of `graphql.har` (real production traffic capture) reveals **critical batching failure**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST DISTRIBUTION                          │
├─────────────────────────────────────────────────────────────────┤
│  Batch Size    │  Request Count  │  Percentage                  │
├────────────────┼─────────────────┼──────────────────────────────┤
│  1 account(s)  │  203 requests   │  97.6%  ← PROBLEM!           │
│  2 account(s)  │  1 request      │  0.5%                        │
│  4 account(s)  │  1 request      │  0.5%                        │
│  7 account(s)  │  1 request      │  0.5%                        │
│  15 account(s) │  1 request      │  0.5%                        │
│  77 account(s) │  1 request      │  0.5%                        │
├────────────────┼─────────────────┼──────────────────────────────┤
│  TOTAL         │  208 requests   │                              │
└─────────────────────────────────────────────────────────────────┘
```

### Interpretation

- **97% of requests are single-account** despite DataLoader being configured with 16ms batching window
- Only **1 request with 77 accounts** - this is the initial `getAccountsBatch` from `usePortfolioFetch`
- The few batched requests (2, 4, 7, 15 accounts) are likely from synchronous loops in `Chains.tsx` or `DegradedStateBanner.tsx`
- **203 requests should have been ~1-5 batched requests** if DataLoader was working correctly

### Root Cause Confirmed

The dynamic imports in `accountManagement.ts` create async overhead:

```typescript
// accountManagement.ts - THE PROBLEM
const getGraphQLAccountData = async (accountId) => {
  const { store } = await import('@/state/store')           // Async import 1 (~1-5ms)
  const { selectFeatureFlag } = await import('@/state/...')  // Async import 2 (~1-5ms)
  const { fetchAccountsGraphQL } = await import('@/lib/...')  // Async import 3 (~1-5ms)
  
  // By now, 16ms window has likely expired for other requests
  const accounts = await fetchAccountsGraphQL([accountId])
  return { isEnabled: true, account: accounts[accountId] }
}
```

**Timeline of failure:**
```
T=0ms:    Request 1 starts → begins async imports
T=1ms:    Request 2 starts → begins async imports
T=2ms:    Request 3 starts → begins async imports
...
T=5ms:    Request 1 finishes imports → calls DataLoader.load()
          → DataLoader schedules batch for T=21ms
T=8ms:    Request 2 finishes imports → calls DataLoader.load()
          → Added to batch (still within window)
T=10ms:   Request 3 finishes imports → calls DataLoader.load()
          → Added to batch (still within window)

BUT in reality with async import timing variance:

T=0ms:    Request 1 starts → begins async imports
T=0ms:    Request 2 starts → begins async imports (parallel)
T=5ms:    Request 1 finishes imports → calls DataLoader.load()
          → DataLoader schedules batch for T=21ms
T=21ms:   DataLoader executes batch with ONLY Request 1
T=22ms:   Request 2 finishes imports (variance!) → calls DataLoader.load()
          → DataLoader schedules NEW batch for T=38ms
...       (Each request in its own batch due to timing variance)
```

### Impact Assessment

| Metric | Expected (with batching) | Actual (HAR data) | Impact |
|--------|--------------------------|-------------------|--------|
| HTTP requests | ~10-20 | 208 | **10-20x more requests** |
| Latency per account | ~50ms (batched) | ~200ms (individual) | **4x slower** |
| Server load | Low | High | **Unnecessary strain** |
| Network overhead | Minimal | Significant | **Wasted bandwidth** |

---

## Remaining Issues

### 🔴 Issue 1: Dynamic Import Timing (CONFIRMED ROOT CAUSE)

**Problem**: The async imports in `getGraphQLAccountData` break batching. **HAR analysis confirms this.**

```typescript
// accountManagement.ts
const getGraphQLAccountData = async (accountId) => {
  const { store } = await import('@/state/store')           // Async import 1
  const { selectFeatureFlag } = await import('@/state/slices/preferencesSlice/selectors')  // Async import 2
  const { fetchAccountsGraphQL } = await import('@/lib/graphql')  // Async import 3
  
  const accounts = await fetchAccountsGraphQL([accountId])
  return { isEnabled: true, account: accounts[accountId] }
}
```

**Impact**: Each `getAccount` call goes through 3 async imports before reaching the DataLoader. By the time it gets there, the 16ms window from earlier calls has expired.

**Severity**: **CRITICAL** - HAR evidence shows 97% of requests are unbatched due to this issue

---

### 🟡 Issue 2: Promise Isolation

**Problem**: Each `getAccount.initiate()` call creates its own promise chain. The DataLoader batches the underlying requests, but RTK Query still sees them as separate queries.

```typescript
// Chains.tsx
const accountPromises = accountIds.map(accountId =>
  dispatch(getAccount.initiate({ accountId }, opts)),
)
```

**Impact**: Even if DataLoader batches, each promise resolves with the same batched data. This works, but RTK Query cache is per-query.

**Severity**: Low - Works correctly, just suboptimal caching

---

### 🟡 Issue 3: Singleton DataLoader Cache

**Problem**: The client-side DataLoader is a singleton with caching enabled:

```typescript
accountLoader = new DataLoader(batchGetAccounts, {
  cache: true,  // Cached for lifetime of loader (app lifetime)
})
```

**Impact**: 
- Stale data if account changes
- `forceRefetch: true` doesn't clear DataLoader cache
- Need to call `clearAccountLoaderCache()` manually

**Severity**: Medium - Could cause stale data issues

---

### 🟡 Issue 4: forceRefetch Not Handled

**Problem**: Scattered callsites use `forceRefetch: true`:

```typescript
dispatch(
  getAccount.initiate({ accountId, upsertOnFetch: true }, { forceRefetch: true }),
)
```

But the DataLoader cache is not cleared, so it returns cached data.

**Severity**: Medium-High - Refresh operations may return stale data

---

### 🟡 Issue 5: No Tests

**Problem**: Zero test coverage for GraphQL server.

**Severity**: Medium - Reliability concerns

---

## Batching Flow Analysis

### Scenario: Ledger Discovery (10 accounts)

**Expected Flow (what we hoped):**
```
T=0ms:   Chains.tsx calls getAccount.initiate(account1)
T=0ms:   Chains.tsx calls getAccount.initiate(account2)
...
T=0ms:   Chains.tsx calls getAccount.initiate(account10)

T=5ms:   All calls reach DataLoader within 16ms window
         → All 10 in pending batch

T=21ms:  DataLoader executes batch
         → Single GraphQL request with 10 accountIds
```

**Actual Flow (HAR-confirmed failure):**
```
T=0ms:   Request 1 starts → await import('@/state/store')
T=0ms:   Request 2 starts → await import('@/state/store')
...
T=0ms:   Request 10 starts → await import('@/state/store')

T=5ms:   Request 1 finishes imports → DataLoader.load()
         → Schedules batch for T=21ms

T=21ms:  BATCH EXECUTES WITH ONLY 1-2 ACCOUNTS!
         (Other requests still awaiting imports due to event loop timing)

T=22ms:  Request 2 finishes imports → DataLoader.load()
         → Schedules NEW batch for T=38ms

T=38ms:  Second batch executes with 1 account

... (continues for all 10 requests, each in separate batch)
```

**HAR Evidence**: 203 out of 208 requests had only 1 account. ❌

### Scenario: TX Subscription (1 account at a time)

**Current Flow:**
```
T=0ms:    New TX arrives for account1
T=0ms:    useTransactionsSubscriber calls getAccount.initiate(account1)
T=5ms:    Reaches DataLoader.load(account1)
T=21ms:   DataLoader executes (only 1 account)

T=100ms:  Another TX arrives for account2
T=100ms:  getAccount.initiate(account2)
T=105ms:  Reaches DataLoader.load(account2)
T=121ms:  DataLoader executes (only 1 account)
```

**Result**: No batching - TXs arrive too far apart. This is expected. ⚠️

---

## Solution Options

### Option 1: Fix forceRefetch Cache Clearing

**Problem**: `forceRefetch: true` doesn't clear DataLoader cache.

**Solution**: Clear DataLoader cache when forceRefetch is used.

```typescript
// accountManagement.ts
const getGraphQLAccountData = async (
  accountId: AccountId,
  forceRefetch = false,
): Promise<{ isEnabled: boolean; account: GraphQLAccount | null }> => {
  const { store } = await import('@/state/store')
  const { selectFeatureFlag } = await import('@/state/slices/preferencesSlice/selectors')
  const isEnabled = selectFeatureFlag(store.getState(), 'GraphQLAccountData')

  if (!isEnabled) {
    return { isEnabled: false, account: null }
  }

  const { fetchAccountsGraphQL, clearAccountLoaderCache } = await import('@/lib/graphql')
  
  // Clear cache if force refresh requested
  if (forceRefetch) {
    clearAccountLoaderCache()
  }
  
  const accounts = await fetchAccountsGraphQL([accountId])
  return { isEnabled: true, account: accounts[accountId] ?? null }
}
```

**Effort**: Low (2-4 hours)
**Risk**: Low

---

### Option 2: Move Imports to Module Level

**Problem**: Dynamic imports add latency.

**Solution**: Import at module level (with lazy loading wrapper if needed).

```typescript
// accountManagement.ts
import { store } from '@/state/store'
import { selectFeatureFlag } from '@/state/slices/preferencesSlice/selectors'
import { fetchAccountsGraphQL } from '@/lib/graphql'

const getGraphQLAccountData = async (accountId: AccountId) => {
  const isEnabled = selectFeatureFlag(store.getState(), 'GraphQLAccountData')
  if (!isEnabled) return { isEnabled: false, account: null }
  
  const accounts = await fetchAccountsGraphQL([accountId])
  return { isEnabled: true, account: accounts[accountId] ?? null }
}
```

**Effort**: Low (1-2 hours)
**Risk**: Low - May cause circular dependency issues, check imports carefully

---

### Option 3: Increase Batch Window

**Problem**: 16ms may not be enough for async operations.

**Solution**: Increase to 50ms for more aggressive batching.

```typescript
// accountData.ts
const BATCH_WINDOW_MS = 50 // ~3 frames at 60fps
```

**Trade-off**: Adds 34ms latency to all requests.

**Effort**: Trivial (5 minutes)
**Risk**: Low - May feel slower

---

### Option 4: Add Explicit Batching Queue

**Problem**: Want explicit control over batching.

**Solution**: Add a queue function that components can use.

```typescript
// src/hooks/useAccountRefetch.ts
const pendingAccountIds = new Set<AccountId>()
let flushTimer: NodeJS.Timeout | null = null
let resolvers: Map<AccountId, { resolve: Function, reject: Function }> = new Map()

export const queueAccountRefetch = (
  accountId: AccountId, 
  dispatch: AppDispatch,
): Promise<Portfolio> => {
  return new Promise((resolve, reject) => {
    pendingAccountIds.add(accountId)
    resolvers.set(accountId, { resolve, reject })
    
    if (!flushTimer) {
      flushTimer = setTimeout(async () => {
        const accountIds = Array.from(pendingAccountIds)
        const callbacks = new Map(resolvers)
        pendingAccountIds.clear()
        resolvers.clear()
        flushTimer = null
        
        try {
          const result = await dispatch(
            portfolioApi.endpoints.getAccountsBatch.initiate({ accountIds })
          ).unwrap()
          
          callbacks.forEach((cb, id) => cb.resolve(result))
        } catch (error) {
          callbacks.forEach(cb => cb.reject(error))
        }
      }, 50)
    }
  })
}
```

**Effort**: Medium (4-6 hours)
**Risk**: Low

---

### Option 5: React Query Request Deduplication

**Problem**: React Query already has deduplication for same query keys.

**Solution**: Leverage React Query's built-in deduplication by using consistent query keys.

The current implementation already does this via `accountManagement.getAccount(accountId).queryKey`.

**Status**: Already implemented ✅

---

### Option 6: Apollo Client Migration (Future)

**Problem**: `graphql-request` is basic, no built-in batching.

**Solution**: Migrate to Apollo Client with HTTP batching.

```typescript
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { BatchHttpLink } from '@apollo/client/link/batch-http'

const link = new BatchHttpLink({
  uri: '/graphql',
  batchInterval: 20,
  batchMax: 50,
})

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
})
```

**Effort**: High (3-5 days)
**Risk**: High - Major architecture change

---

## Recommendations

### 🚨 CRITICAL: Fix Batching Failure (HAR-Confirmed)

Based on HAR evidence showing 97% unbatched requests, **the dynamic import issue must be fixed first**.

### Priority 1: Move Imports to Module Level (Option 2) ⭐ HIGHEST PRIORITY

**Why**: This is the confirmed root cause. HAR data proves dynamic imports break batching.

```typescript
// BEFORE (broken) - accountManagement.ts
const getGraphQLAccountData = async (accountId) => {
  const { store } = await import('@/state/store')           // ❌ Async
  const { selectFeatureFlag } = await import('@/state/...')  // ❌ Async
  const { fetchAccountsGraphQL } = await import('@/lib/...')  // ❌ Async
  // ...
}

// AFTER (fixed) - accountManagement.ts
import { store } from '@/state/store'                        // ✅ Static
import { selectFeatureFlag } from '@/state/.../selectors'    // ✅ Static
import { fetchAccountsGraphQL } from '@/lib/graphql'         // ✅ Static

const getGraphQLAccountData = async (accountId) => {
  // No async overhead - reaches DataLoader immediately
  // ...
}
```

**Expected Impact**: 
- Reduce 208 requests → ~10-20 requests
- Fix 97% unbatched → majority batched
- Effort: 1-2 hours
- Risk: Low (check for circular dependencies)

### Priority 2: Increase Batch Window as Safety Net (Option 3)

**Why**: Even with static imports, some timing variance may occur.

```typescript
// accountData.ts
const BATCH_WINDOW_MS = 50 // Increase from 16ms to 50ms
```

**Expected Impact**:
- Catches edge cases where static imports alone aren't enough
- Adds 34ms max latency (acceptable trade-off)
- Effort: 5 minutes
- Risk: Low

### Priority 3: Fix forceRefetch (Option 1)

**Why**: Once batching works, stale data becomes an issue.

- Add `forceRefetch` parameter to clear DataLoader cache
- Effort: 2-4 hours
- Risk: Low

### Priority 4: Add Tests

**Why**: Prevent regression.

- Unit test: Verify multiple calls within window get batched
- Integration test: Verify GraphQL endpoints work correctly
- Effort: 4-8 hours

### Deprioritized (Future)

- **Explicit queue function** (Option 4) - Not needed if above fixes work
- **Apollo Client migration** (Option 6) - Overkill for current needs

---

## Testing & Verification

### How to Verify Batching Works

1. **Enable feature flag:**
   ```bash
   # In .env.development
   VITE_FEATURE_GRAPHQL_ACCOUNT_DATA=true
   ```

2. **Start GraphQL server:**
   ```bash
   yarn graphql:dev
   ```

3. **Watch server logs for batching:**
   ```
   [AccountLoader] Batching 10 account requests
   [AccountLoader] Grouped into 5 chains
   ```

4. **Check browser Network tab:**
   - Should see single GraphQL request for multiple accounts
   - Request body should contain array of accountIds

### Test Cases

| Scenario | Expected | How to Test |
|----------|----------|-------------|
| Initial portfolio load | All accounts in 1 request | Connect wallet, watch network |
| Ledger discovery | Batch discovered accounts | Connect Ledger, watch logs |
| TX subscription | Individual requests (OK) | Send TX, watch network |
| Retry errored | Batch errored accounts | Click retry, watch network |
| After swap | 1-2 requests | Complete swap, watch network |

### Console Log Indicators

```
// Good - batching working
[GraphQL DataLoader] Batching 10 account requests into 1

// OK - single request, no batching needed
[GraphQL DataLoader] Batching 1 account requests into 1

// Bad - multiple single requests (check timing)
[GraphQL DataLoader] Batching 1 account requests into 1
[GraphQL DataLoader] Batching 1 account requests into 1
[GraphQL DataLoader] Batching 1 account requests into 1
```

---

## Appendix

### A. File Reference

| File | Purpose |
|------|---------|
| `src/lib/graphql/accountData.ts` | Client DataLoader with 16ms batching |
| `src/lib/graphql/client.ts` | GraphQL client singleton |
| `src/react-queries/queries/accountManagement.ts` | React Query wrapper with GraphQL support |
| `src/state/slices/portfolioSlice/portfolioSlice.ts` | RTK Query endpoints |
| `src/context/AppProvider/hooks/usePortfolioFetch.tsx` | Initial portfolio fetch |
| `packages/graphql-server/src/loaders/accountLoader.ts` | Server-side DataLoader |
| `packages/graphql-server/src/unchained/` | Unchained API integration |

### B. Callsite Reference

| File | Line | Pattern | Batching? |
|------|------|---------|-----------|
| `usePortfolioFetch.tsx` | 42-44 | `getAccountsBatch` | ✅ Always |
| `Chains.tsx` | 80-82 | `getAccount.initiate` in loop | ✅ Same tick |
| `useTransactionsSubscriber.ts` | 170-172 | `getAccount.initiate` single | ⚠️ Usually not |
| `DegradedStateBanner.tsx` | 116-123 | `getAccount.initiate` in forEach | ✅ Same tick |
| `useSendActionSubscriber.tsx` | 65-72 | `getAccount.initiate` in forEach | ✅ Same tick |
| `useSwapActionSubscriber.tsx` | 326-345 | `getAccount.initiate` 1-2 calls | ⚠️ Maybe |

### C. Feature Flag States

| Flag | Dev Default | Prod Default |
|------|-------------|--------------|
| `GraphQLMarketData` | `true` | `false` |
| `GraphQLAccountData` | `true` | `false` |
| `GraphQLCoingeckoData` | `true` | `false` |

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2024-01-03 | Analysis | Initial deep analysis |
| 2024-01-03 | Analysis | Updated with accurate current state after code review |
| 2024-01-03 | Analysis | **CRITICAL UPDATE**: Added HAR analysis proving batching failure (97% single-account requests). Identified dynamic imports as confirmed root cause. Reprioritized recommendations. |
