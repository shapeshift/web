# GraphQL Account Batching: Deep Analysis & Solution Options

## Executive Summary

The current GraphQL POC branch has implemented a multi-layer architecture with DataLoader batching at both client and server. After **deep analysis including HAR data**, the architecture has been significantly improved, but **critical issues remain**.

**Key Finding**: HAR analysis showed 97% of requests (203/208) contained only 1 account. The root cause has been identified as the **ManageAccounts modal's table row rendering pattern**, NOT the main portfolio fetch paths which have been fixed.

**Root Causes Identified**:
1. `ImportAccounts.tsx` - Each table row independently fetches via `useQuery` with `refetchOnMount: 'always'`
2. Dynamic imports in `accountManagement.ts` add async overhead exceeding 16ms DataLoader window
3. Server-side: No Unchained API batching - each account makes individual HTTP call

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [What's Working Well](#whats-working-well) (UPDATED)
3. [Evidence from HAR Analysis](#-evidence-from-har-analysis)
4. [Root Cause Analysis](#-root-cause-analysis) (NEW)
5. [Remaining Issues](#remaining-issues)
6. [Solution Options](#solution-options)
7. [Recommendations](#recommendations)
8. [Testing & Verification](#testing--verification)

---

## Current Architecture

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT IMPLEMENTATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    BATCH PATH (WORKING WELL) ✅                      │   │
│   │                                                                       │   │
│   │   usePortfolioFetch ─────────┐                                       │   │
│   │   Chains.tsx ─────────────────┼──► getAccountsBatch.initiate()       │   │
│   │   DegradedStateBanner ────────┤              │                       │   │
│   │   useSendActionSubscriber ────┤              ▼                       │   │
│   │   useSwapActionSubscriber ────┤    fetchAccountsGraphQL(all)         │   │
│   │   useTransactionsSubscriber ──┘              │                       │   │
│   │     (debounced 1000ms)                       ▼                       │   │
│   │                                   Client DataLoader (16ms)           │   │
│   │                                              │                       │   │
│   │                                              ▼                       │   │
│   │                                   GraphQL HTTP Request               │   │
│   │                                   (77 accounts in HAR)               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                  INDIVIDUAL PATH (THE PROBLEM) ❌                    │   │
│   │                                                                       │   │
│   │   ImportAccounts.tsx ──────┐                                         │   │
│   │     (each table row)        │                                         │   │
│   │                             ├──► useQuery(accountManagement.getAccount)│   │
│   │   ManageAccounts/helpers ──┤              │                          │   │
│   │     (fallback path)         │              ▼                          │   │
│   │                             │    await import('@/state/store')       │   │
│   │                             │    await import('@/state/.../selectors')│   │
│   │                             │    await import('@/lib/graphql')        │   │
│   │                             │              │                          │   │
│   │                             │              ▼                          │   │
│   │                             │    fetchAccountsGraphQL([single])       │   │
│   │                             │              │                          │   │
│   │                             │              ▼                          │   │
│   │                             │    DataLoader (16ms window EXPIRED!)   │   │
│   │                             │              │                          │   │
│   │                             │              ▼                          │   │
│   │                             │    Individual GraphQL Request           │   │
│   │                             │    (203 requests in HAR!)               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Layer | Component | Location | Status |
|-------|-----------|----------|--------|
| **Client** | GraphQL Client | `src/lib/graphql/client.ts` | ✅ Singleton |
| **Client** | Account DataLoader | `src/lib/graphql/accountData.ts` | ✅ 16ms window |
| **Client** | `fetchAccountsGraphQL` | `src/lib/graphql/accountData.ts` | ✅ Uses DataLoader |
| **Client** | `getAccountsBatch` | `portfolioSlice.ts` | ✅ Batches correctly |
| **Client** | `getAccount` | `portfolioSlice.ts` | ⚠️ Individual calls |
| **Client** | `accountManagement` | `accountManagement.ts` | ❌ Dynamic imports! |
| **Server** | Account DataLoader | `packages/graphql-server/src/loaders/accountLoader.ts` | ✅ Groups by chain |
| **Server** | Unchained Integration | `packages/graphql-server/src/unchained/` | ❌ No batch API |

---

## What's Working Well

### ✅ Main Portfolio Fetch Paths - ALL USE BATCH!

**Recent fixes have converted all major callsites to use `getAccountsBatch`:**

| Callsite | Method | Batching |
|----------|--------|----------|
| `usePortfolioFetch.tsx` | `getAccountsBatch` | ✅ All accounts in 1 request |
| `Chains.tsx` (Ledger) | `getAccountsBatch` | ✅ All derived accounts |
| `DegradedStateBanner.tsx` | `getAccountsBatch` | ✅ All errored accounts |
| `useSendActionSubscriber.tsx` | `getAccountsBatch` | ✅ Accounts to refresh |
| `useSwapActionSubscriber.tsx` | `getAccountsBatch` | ✅ Sell + buy accounts |
| `useTransactionsSubscriber.ts` | `getAccountsBatch` | ✅ Debounced 1000ms! |

### ✅ Transaction Subscriber - Best Optimized

```typescript
// useTransactionsSubscriber.ts - EXCELLENT PATTERN
const ACCOUNT_REFRESH_DEBOUNCE_MS = 1000

const queueAccountRefresh = useCallback((accountId: AccountId) => {
  pendingAccountRefreshes.current.add(accountId)  // Accumulate in Set
  
  if (debounceTimer.current) clearTimeout(debounceTimer.current)
  
  debounceTimer.current = setTimeout(flushAccountRefreshes, ACCOUNT_REFRESH_DEBOUNCE_MS)
}, [flushAccountRefreshes])

const flushAccountRefreshes = useCallback(() => {
  const accountIds = Array.from(pendingAccountRefreshes.current)
  pendingAccountRefreshes.current.clear()
  
  dispatch(getAccountsBatch.initiate({ accountIds }, { forceRefetch: true }))
}, [dispatch])
```

**Impact**: 10 TX events in 1s → 1 batched request (10x reduction)

---

## 🚨 Evidence from HAR Analysis

### HAR File Analysis Results

Analysis of `graphql.har` (real traffic capture) reveals **batching works for main paths, fails for ManageAccounts modal**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST DISTRIBUTION                          │
├─────────────────────────────────────────────────────────────────┤
│  Batch Size    │  Request Count  │  Source                      │
├────────────────┼─────────────────┼──────────────────────────────┤
│  77 account(s) │  1 request      │  ✅ getAccountsBatch         │
│  15 account(s) │  1 request      │  ✅ getAccountsBatch         │
│  7 account(s)  │  1 request      │  ✅ getAccountsBatch         │
│  4 account(s)  │  1 request      │  ✅ getAccountsBatch         │
│  2 account(s)  │  1 request      │  ✅ getAccountsBatch         │
│  1 account(s)  │  203 requests   │  ❌ ImportAccounts rows!     │
├────────────────┼─────────────────┼──────────────────────────────┤
│  TOTAL         │  208 requests   │                              │
└─────────────────────────────────────────────────────────────────┘
```

### Interpretation

- **Batched requests (5 total, 105 accounts)**: From `getAccountsBatch` - working correctly!
- **Single-account requests (203)**: From `ImportAccounts.tsx` table row rendering

---

## 🔴 Root Cause Analysis

### Primary Cause: ImportAccounts Table Row Rendering

**File**: `src/components/Modals/ManageAccounts/components/ImportAccounts.tsx`

```typescript
// Lines 93-100 - EACH TABLE ROW DOES THIS!
const TableRowAccount = ({ accountId }) => {
  const { data: account } = useQuery({
    ...accountManagement.getAccount(accountId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: 'always',  // ← REFETCHES EVERY MOUNT!
  })
  // ...
}
```

**Why batching fails**:
1. Each row is a separate React component
2. React renders rows asynchronously (not all in same tick)
3. Each row's `useQuery` triggers `accountManagement.getAccount()`
4. Dynamic imports add 3-15ms async overhead per call
5. By the time request reaches DataLoader, 16ms window has expired
6. Each row becomes its own batch of 1

**Timing breakdown**:
```
T=0ms:    Row 1 mounts → useQuery → accountManagement.getAccount()
T=0ms:    Row 2 mounts → useQuery → accountManagement.getAccount()
...
T=5ms:    Row 1 finishes dynamic imports → DataLoader.load()
          → Schedules batch for T=21ms
T=21ms:   BATCH EXECUTES WITH ONLY ROW 1!
T=22ms:   Row 2 finishes imports → DataLoader.load()
          → Schedules NEW batch for T=38ms
...       (Each row in its own batch)
```

### Secondary Cause: ManageAccounts Helpers Fallback

**File**: `src/components/Modals/ManageAccounts/helpers.ts`

```typescript
// Lines 82-94 - Legacy fallback when GraphQL fails
return Promise.all(
  Object.entries(accountIdsAndMetadata).map(async ([accountId]) => {
    const account = await queryClient.fetchQuery({
      ...accountManagement.getAccount(accountId),  // ← Individual calls!
      staleTime: Infinity,
      gcTime: Infinity,
    })
    // ...
  }),
)
```

### Tertiary Cause: Server-Side No Unchained Batching

**File**: `packages/graphql-server/src/loaders/accountLoader.ts`

```typescript
// Each account makes individual HTTP call to Unchained
const results = await Promise.all(
  accounts.map(({ accountId, pubkey }) =>
    limit(async () => {
      const data = await api.getAccount({ pubkey })  // ← Individual HTTP!
      // ...
    }),
  ),
)
```

**Impact**: Even with GraphQL batching, server makes N HTTP calls for N accounts.

---

## Remaining Issues

### 🔴 Issue 1: ImportAccounts Row Rendering (CRITICAL)

**Problem**: Each table row independently fetches account via `useQuery`.

**Impact**: 97% of GraphQL requests are single-account due to this pattern.

**Severity**: **CRITICAL** - Main source of unbatched requests

---

### 🔴 Issue 2: Dynamic Imports in accountManagement (CRITICAL)

**Problem**: 3 async imports before reaching DataLoader:

```typescript
const getGraphQLAccountData = async (accountId) => {
  const { store } = await import('@/state/store')           // ~1-5ms
  const { selectFeatureFlag } = await import('@/state/...')  // ~1-5ms
  const { fetchAccountsGraphQL } = await import('@/lib/...')  // ~1-5ms
  // Total: 3-15ms overhead per call
}
```

**Severity**: **CRITICAL** - Causes 16ms batch window to expire

---

### 🟡 Issue 3: Server-Side No Unchained Batching

**Problem**: Each account fetched individually from Unchained API.

**Impact**: 100 accounts = 100 HTTP requests to Unchained (with pLimit(5) concurrency)

**Severity**: Medium - Server load, but not client-visible

---

### 🟡 Issue 4: DataLoader Cache Not Cleared on forceRefetch

**Problem**: `forceRefetch: true` doesn't clear DataLoader cache.

**Severity**: Medium - Stale data possible

---

## Solution Options

### Option 1: Fix ImportAccounts with Batch Fetching ⭐ HIGHEST PRIORITY

**Problem**: Each row fetches independently.

**Solution**: Lift data fetching to parent, pass down as props.

```typescript
// Parent component fetches ALL accounts at once
const ImportAccountsTable = ({ accountIds }) => {
  const { data: accounts } = useQuery({
    queryKey: ['accounts-batch', accountIds],
    queryFn: async () => {
      const { fetchAccountsGraphQL } = await import('@/lib/graphql')
      return fetchAccountsGraphQL(accountIds)
    },
    staleTime: Infinity,
  })
  
  return accountIds.map(id => (
    <TableRowAccount 
      key={id} 
      account={accounts?.[id]}  // Pass data as prop!
    />
  ))
}

// Row component receives data, doesn't fetch
const TableRowAccount = ({ account }) => {
  // No useQuery - just uses passed data
  return <Td>{account?.balance}</Td>
}
```

**Expected Impact**: 
- Reduce 203 requests → 1-2 requests
- ~95% reduction in ManageAccounts modal requests
- Effort: 2-4 hours
- Risk: Low

---

### Option 2: Remove Dynamic Imports in accountManagement

**Problem**: Dynamic imports add async overhead.

**Solution**: Static imports at module level.

```typescript
// BEFORE (broken)
const getGraphQLAccountData = async (accountId) => {
  const { store } = await import('@/state/store')
  const { selectFeatureFlag } = await import('@/state/.../selectors')
  const { fetchAccountsGraphQL } = await import('@/lib/graphql')
  // ...
}

// AFTER (fixed)
import { store } from '@/state/store'
import { selectFeatureFlag } from '@/state/.../selectors'
import { fetchAccountsGraphQL } from '@/lib/graphql'

const getGraphQLAccountData = async (accountId) => {
  // No async overhead - reaches DataLoader immediately
  // ...
}
```

**Expected Impact**:
- Improves batching for any remaining individual calls
- Effort: 1-2 hours
- Risk: Low (check circular dependencies)

---

### Option 3: Increase Batch Window

**Problem**: 16ms may be too short.

**Solution**: Increase to 50ms.

```typescript
// accountData.ts
const BATCH_WINDOW_MS = 50 // ~3 frames at 60fps
```

**Expected Impact**:
- Catches more requests in same batch
- Trade-off: Adds 34ms latency to all requests
- Effort: 5 minutes
- Risk: Low

---

### Option 4: Server-Side Unchained Batching

**Problem**: No batch endpoint used.

**Solution**: Check if Unchained supports batch endpoints, or implement request coalescing.

**Effort**: Medium-High (requires API investigation)
**Risk**: Medium (API changes)

---

## Recommendations

### Phase 1: Fix ImportAccounts (Immediate)

1. **Lift data fetching to parent** - Use single `fetchAccountsGraphQL` call
2. **Pass account data as props** - Remove `useQuery` from row components
3. **Effort**: 2-4 hours
4. **Expected Impact**: 95% reduction in single-account requests

### Phase 2: Remove Dynamic Imports (Short-term)

1. **Convert to static imports** in `accountManagement.ts`
2. **Test for circular dependencies**
3. **Effort**: 1-2 hours
4. **Expected Impact**: Improves batching for edge cases

### Phase 3: Increase Batch Window (Safety Net)

1. **Increase from 16ms to 50ms**
2. **Effort**: 5 minutes
3. **Expected Impact**: Catches more edge cases

### Phase 4: Server-Side Optimization (Future)

1. **Investigate Unchained batch endpoints**
2. **Implement response caching**
3. **Effort**: 1-2 days
4. **Expected Impact**: Reduced server load

---

## Testing & Verification

### How to Verify Fixes Work

1. **Open ManageAccounts modal**
2. **Watch Network tab for GraphQL requests**
3. **Expected BEFORE fix**: Many single-account requests
4. **Expected AFTER fix**: 1-2 batched requests

### Console Log Indicators

```
// Good - batching working
[GraphQL DataLoader] Batching 50 account requests into 1

// Bad - batching failing
[GraphQL DataLoader] Batching 1 account requests into 1
[GraphQL DataLoader] Batching 1 account requests into 1
[GraphQL DataLoader] Batching 1 account requests into 1
```

---

## Appendix

### A. Callsite Summary (After Recent Fixes)

| Callsite | Uses | Batching Status |
|----------|------|-----------------|
| `usePortfolioFetch.tsx` | `getAccountsBatch` | ✅ Fixed |
| `Chains.tsx` | `getAccountsBatch` | ✅ Fixed |
| `DegradedStateBanner.tsx` | `getAccountsBatch` | ✅ Fixed |
| `useSendActionSubscriber.tsx` | `getAccountsBatch` | ✅ Fixed |
| `useSwapActionSubscriber.tsx` | `getAccountsBatch` | ✅ Fixed |
| `useTransactionsSubscriber.ts` | `getAccountsBatch` (debounced) | ✅ Fixed |
| `ImportAccounts.tsx` rows | `useQuery` (individual) | ❌ NEEDS FIX |
| `ManageAccounts/helpers.ts` | `Promise.all` (individual) | ❌ NEEDS FIX |

### B. Individual getAccount Usage

Only ONE place uses individual `getAccount.initiate()`:
- `usePortfolioFetch.tsx` line 47 - **ONLY when GraphQL is DISABLED**

When GraphQL is enabled, ALL paths use `getAccountsBatch`.

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
| 2024-01-03 | Analysis | Updated with HAR evidence |
| 2024-01-03 | Analysis | **MAJOR UPDATE**: Deep analysis revealed ImportAccounts.tsx as primary source of 203 single-account requests. All main callsites have been fixed to use getAccountsBatch. Updated recommendations to focus on ImportAccounts fix. |
