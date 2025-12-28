# Redux Architecture Spike - Comprehensive Findings

**Branch:** `feat_redux_perf_spike` (stacked on PR #11520)
**Status:** Documentation only - DO NOT IMPLEMENT YET

---

## Executive Summary

Comprehensive spike into Redux store architecture identified **17MB of unnecessary state**, multiple memory leaks, O(n²) selector patterns, and React anti-patterns.

### Empirical Data (Console Logs)

| Slice | Size | % of Total | Notes |
|-------|------|------------|-------|
| **assets** | **17.07 MB** | **90%** | 25,468 assets, 1.7MB redundant ids array |
| marketData | 0.80 MB | 4% | 3,065 items, very chatty (1-item upserts) |
| portfolio | 0.09 MB | <1% | Reasonable |
| opportunities | 0.00 MB | 0% | Empty until defi interactions |
| txHistory | 0.00 MB | 0% | Grows over time |
| tradeQuote | 0.00 MB | 0% | Transient |
| **Total** | **~19 MB** | 100% | After wallet connect |

### Key Observations
1. **Assets is 90% of the problem** - 17MB of 19MB total
2. **`idsRedundant: true`** - Confirmed ids arrays are pure duplication
3. **`idsArrayByteSize: 1,737,871`** - 1.7MB just for redundant ids!
4. **MarketData is chatty** - Dozens of single-item upserts instead of batching
5. **On refresh, persisted state loads instantly to 18MB+**

---

## THE BIG INSIGHT: React-Query vs Redux for Assets

**Current Flow (PR #11520):**
```
App Start → useQuery fetches assets JSON → dispatch to Redux → 17MB in store
```

**Proposed Flow:**
```
App Start → useQuery fetches assets JSON → stays in react-query cache → ~0MB in Redux
```

**Why this works:**
- PR #11520 already uses `useQuery` in AppContext to fetch assets
- React-query already caches the data
- Redux store is just a **redundant copy**
- Selectors like `selectAssetById` can read from react-query cache instead

**What would still need Redux:**
- Runtime-discovered assets (portfolio assets, search results)
- User-specific metadata (spam flags)
- This would be ~100 assets max vs 25,000+

**Impact:** 17MB → <0.1MB for assets slice

---

## Critical Findings

### 1. REDUNDANT `ids` ARRAYS (HIGH IMPACT)

**Every slice** uses `{ byId: {}, ids: [] }` pattern where `ids` is always `Object.keys(byId)`.

**Affected slices:**
- `assetsSlice` - 25k+ asset IDs duplicated (~1.7MB)
- `marketDataSlice.crypto` - 5k+ asset IDs duplicated
- `portfolioSlice.accountMetadata/accounts/accountBalances` - 3x duplication
- `opportunitiesSlice.lp/staking/userStaking` - 3 separate arrays
- `txHistorySlice` - unbounded growth

**Impact:** ~15-20% unnecessary state size, extra array operations on every upsert

**Solution:** Derive `ids` in selectors via `createDeepEqualOutputSelector`:
```typescript
export const selectAssetIds = createDeepEqualOutputSelector(
  selectAssetsById,
  (byId) => Object.keys(byId)
)
```

---

### 2. O(n²) SELECTOR PATTERNS (HIGH IMPACT)

**File:** `src/state/slices/portfolioSlice/selectors.ts`

**Issues found:**
- Lines 863, 936, 956, 987, 995: `accountRows.find(row => row.assetId === assetId)` in loops
- `selectGroupedAssetsWithBalances` does **nested** `.find()` calls

**File:** `src/state/slices/txHistorySlice/selectors.ts`
- Lines 125, 210: `txIds.indexOf(a)` inside sort comparators - O(n*m*log(m))

**File:** `src/state/slices/common-selectors.ts`
- Line 100: `acc.includes(chainId)` in reduce - O(n²)

**Solution:** Pre-compute Maps for O(1) lookups:
```typescript
const rowsByAssetId = new Map(accountRows.map(row => [row.assetId, row]))
const txIdIndexMap = new Map(txIds.map((id, i) => [id, i]))
```

---

### 3. UNBOUNDED CACHE GROWTH (HIGH IMPACT)

**RTK Query caches with `keepUnusedDataFor: Number.MAX_SAFE_INTEGER`:**
- `swapperApi.ts` line 27 - "never clear, we will manage this" (but no cleanup exists)
- `limitOrderApi.ts`
- `snapshot.ts`
- `fiatRamps.ts`
- `abiApi.ts`

**State growth patterns:**
- `txHistorySlice` - all transactions persisted indefinitely
- `marketDataSlice.priceHistory` - accumulates over time
- `tradeQuoteSlice.tradeExecution` - quote states never cleared
- `actionSlice` - actions stored forever with `updatedAt` timestamps

---

### 4. DERIVED DATA STORED AS STATE (MEDIUM IMPACT)

**File:** `src/state/slices/tradeQuoteSlice/tradeQuoteSlice.ts`
- Lines 448-467: `tradeQuoteDisplayCache` is a pre-sorted/deduped array
- Should be computed in selector from `tradeQuotes` + `sortOption`

**File:** `src/state/slices/preferencesSlice/preferencesSlice.ts`
- Lines 140-158: UI state stored in Redux (`showWelcomeModal`, `showConsentBanner`, etc.)
- Should be local component state

---

### 5. DATA DUPLICATION ACROSS SLICES (MEDIUM IMPACT)

**Portfolio + Opportunities:**
- `portfolioSlice.enabledAccountIds` duplicates relationship in `opportunitiesSlice.byAccountId`
- AccountId appears in multiple places

**Portfolio account structure:**
- `accounts.byId[accountId].assetIds[]` duplicates info derivable from `accountBalances.byId[accountId]`

**Assets + Opportunities:**
- `OpportunityMetadata` contains asset fields already in `assetsSlice`

---

### 6. RTK QUERY MISUSE (MEDIUM IMPACT)

**File:** `src/state/slices/marketDataSlice/marketDataSlice.tsx` lines 226-245

```typescript
findByAssetId: build.query<null, AssetId>({
  queryFn: function findByAssetId(assetId, { dispatch }) {
    findbyAssetIdQueue.addItem({ assetId, dispatch, priority: 1 })
    return { data: null }  // Returns null, just dispatches!
  },
})
```

RTK Query used as thunk dispatcher, not for caching. Code comment confirms:
> "TODO(gomes): While adding queuer to this, noting we don't even care about this guy anymore"

---

### 7. MIGRATION OVERKILL (LOW IMPACT)

**File:** `src/state/migrations/index.ts`
- `clearAssetsMigrations`: 256 identical entries (0-255) all calling `clearAssets`
- Symptom of state structure issues requiring frequent clears

---

## MEMORY LEAKS (Fix ASAP)

| File | Line | Issue |
|------|------|-------|
| `src/plugins/mobile/index.tsx` | 31 | Event listener added, never removed |
| `src/context/WalletProvider/Keplr/components/Connect.tsx` | 61 | `keplr_keystorechange` listener never removed |
| `src/components/Layout/Header/NavBar/MobileNavBar.tsx` | 36-39 | **BUG**: Adds to `visualViewport` but removes from `window`! |

---

## MARKET DATA CHATTINESS - ROOT CAUSE

**Problem:** AsyncQueuer dispatches individually when each fetch completes

```
AsyncQueuer (concurrency: 25)
  → fetch asset 1 → dispatch({asset1: data})  // individual
  → fetch asset 2 → dispatch({asset2: data})  // individual
  → ...25 more individual dispatches
```

**prepareAutoBatched doesn't help** because dispatches are async (different microtasks)

**Sources of individual dispatches:**
| Source | File | Pattern |
|--------|------|---------|
| AsyncQueuer | marketDataSlice.tsx:177-191 | Dispatch per completed fetch |
| useQueries | AppContext.tsx:228-253 | Per missing portfolio asset |
| useFetchPriceHistories | useFetchPriceHistories.ts:24-28 | forEach + dispatch |
| LimitOrderInput | LimitOrderInput.tsx:226-232 | Polling per asset |

---

## EXPENSIVE SELECTOR OPERATIONS

| File | Line | Issue |
|------|------|-------|
| portfolioSlice/selectors.ts | 313, 454, 456 | `cloneDeep()` in selectors |
| portfolioSlice/selectors.ts | 342-365 | Nested Object.entries + sort + reduce |
| portfolioSlice/selectors.ts | 102 | `JSON.stringify(accountIds)` as cache key |
| marketDataSlice.tsx | 73, 94, 104 | Multiple Object.keys() on same object |

---

## REACT ANTI-PATTERNS

| File | Issue |
|------|-------|
| WalletButton.tsx:89,99 | useMemo on static JSX (should be const outside) |
| TxWindow.tsx:67 | useMemo on static object |
| DrawerWalletHeader.tsx:94-95 | Same pattern |
| ExpandableStepperSteps.tsx | 355 lines, 15+ useMemos (over-memoization) |
| TradeInput.tsx | 615 lines, should split |
| useSearch.tsx:21-29 | Creates new debounce() on every keystroke |
| AccountToken.tsx:44 | `accountIds.map().includes()` - should use Set |

---

## MISSING OPTIMIZATIONS

| Issue | Location | Fix |
|-------|----------|-----|
| No React.memo on list items | AccountAssetsList.tsx:54-56 | Add memo |
| No virtualization boundary fix | AssetList.tsx:141 | Threshold at 10 causes remounts |
| Web Worker fallback silent | SearchTermAssetList.tsx:146 | No retry/warning |

---

## PRIORITIZED ACTION ITEMS

### LOW HANGING FRUIT (Stack on PR #11520)

| # | Task | Impact | Effort | File(s) |
|---|------|--------|--------|---------|
| 1 | Remove `ids` array from assetsSlice | **-1.7MB** | Low | assetsSlice.ts |
| 2 | Remove `ids` array from marketDataSlice | -0.05MB | Low | marketDataSlice.tsx |
| 3 | Fix MobileNavBar listener bug | Memory leak | Low | MobileNavBar.tsx |
| 4 | Fix Keplr listener cleanup | Memory leak | Low | Connect.tsx |
| 5 | Fix mobile listener cleanup | Memory leak | Low | mobile/index.tsx |
| 6 | Replace useMemo on static JSX with const | Cleaner | Low | WalletButton, TxWindow, etc |
| 7 | Fix debounce recreation | Perf | Low | useSearch.tsx |
| 8 | Fix O(n²) in selectGroupedAssetsWithBalances | Perf | Low | portfolioSlice/selectors.ts |
| 9 | Fix O(n²) in selectWalletConnectedChainIds | Perf | Low | common-selectors.ts |

### MEDIUM EFFORT (Next PR)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 10 | Batch market data dispatches in AsyncQueuer | **Huge perf** | Medium |
| 11 | Remove cloneDeep from selectors | Perf | Low |
| 12 | Fix JSON.stringify cache keys | Perf | Low |
| 13 | Add React.memo to list items | Render perf | Low |
| 14 | Add TTL to RTK Query caches | Memory | Medium |
| 15 | Move `tradeQuoteDisplayCache` to selector | Cleaner | Medium |
| 16 | Remove ids from portfolio/opportunities | -0.1MB | Medium |

### BIG REFACTOR: Assets React-Query Migration (Future PR)

**The nuclear option** - eliminates 90% of store size:

| Step | Description |
|------|-------------|
| 1 | Create `useAssets()` hook that reads from react-query cache |
| 2 | Create `selectAssetById` that checks redux first, falls back to react-query |
| 3 | Reduce assetsSlice to only store runtime-discovered assets |
| 4 | Remove 25k asset upsert on app load |

**Complexity:** HIGH - touches many selectors and components
**Recommendation:** Separate PR after low-hanging fruit

---

## Files Modified (Console Logs Added)

These files have `[PERF SPIKE]` console logs for measurement:

| File | Log Tag | What It Measures |
|------|---------|------------------|
| `src/state/store.ts` | `[REDUX_SIZE]` | Total store size, per-slice breakdown |
| `src/state/slices/assetsSlice/assetsSlice.ts` | `[ASSETS_UPSERT]` | Upsert counts, ids redundancy |
| `src/state/slices/marketDataSlice/marketDataSlice.tsx` | `[MARKET_DATA]` | Market data growth, chattiness |
| `src/state/slices/portfolioSlice/selectors.ts` | `[SELECTOR_PERF]` | selectGroupedAssetsWithBalances timing |
| `src/state/slices/tradeQuoteSlice/tradeQuoteSlice.ts` | `[QUOTE_CACHE]` | Quote cache size |

---

## Reference: All Issues by File

| File | Issue | Severity |
|------|-------|----------|
| `assetsSlice.ts` | Redundant ids array (1.7MB) | **CRITICAL** |
| `portfolioSlice/selectors.ts` | O(n²) patterns, cloneDeep | HIGH |
| `common-selectors.ts` | O(n²) includes() | HIGH |
| `MobileNavBar.tsx` | Memory leak (listener bug) | HIGH |
| `Connect.tsx` (Keplr) | Memory leak | HIGH |
| `mobile/index.tsx` | Memory leak | HIGH |
| `marketDataSlice.tsx` | Chatty dispatches, redundant ids | MEDIUM |
| `tradeQuoteSlice.ts` | Derived data as state | MEDIUM |
| `swapperApi.ts` | Infinite cache | MEDIUM |
| `txHistorySlice.ts` | Unbounded growth | MEDIUM |
| `useSearch.tsx` | Debounce recreation | MEDIUM |
| `WalletButton.tsx` | useMemo on static JSX | LOW |
| `preferencesSlice.ts` | UI state in Redux | LOW |

---

## Notes

- Console logs are DEV-only (`import.meta.env.DEV`)
- Do NOT push this branch - local only for now
- PR #11520 addresses some issues (moves assets to runtime fetch)
- React-query migration would build on #11520's foundation
