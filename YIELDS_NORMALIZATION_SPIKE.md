# 🔍 Yields Feature - Normalization Review & DefiLlama Analysis

## Executive Summary

The Yields feature has **significant normalization issues** that cause redundant API calls, duplicate data processing, and excessive re-computation in components. This document outlines the issues, compares with DefiLlama's approach, and provides recommendations.

---

## 🔴 Critical Issues - Current Implementation

### 1. **Duplicate Balance Fetching (Same Data, Multiple Queries)**

The same balance data is fetched **multiple times** on the detail page:

| Component | Hook Used | Same Data? |
|-----------|-----------|------------|
| `YieldDetail.tsx` (line 64) | `useYieldBalances` | ✅ |
| `YieldPositionCard.tsx` (line 83) | `useYieldBalances` | ✅ |
| `ValidatorBreakdown.tsx` (line 98) | `useYieldBalances` | ✅ |
| `YieldEnterExit.tsx` (line 140) | `useYieldBalances` | ✅ |

**Impact:** 4 identical API calls for the same `(yieldId, address)` pair per page load.

**Recommendation:** Fetch balances ONCE at `YieldDetail` level and pass down via props or context.

---

### 2. **No Centralized Normalized Store**

Unlike the rest of ShapeShift which uses Redux with normalized slices (e.g., `portfolioSlice`), Yields data lives entirely in React Query without normalization:

- `useYields()` returns denormalized array with inline `byId`, `byAssetSymbol` indices
- `useAllYieldBalances()` returns `{ [yieldId]: AugmentedYieldBalance[] }` - good start but computed client-side
- No Redux slice for yield positions

**Impact:** Every component re-derives the same lookups. No cross-component cache sharing.

**Recommendation:** Create a `yieldsSlice` in Redux that stores:
```typescript
type YieldsState = {
  yields: {
    byId: Record<string, AugmentedYieldDto>
    ids: string[]
  }
  balances: {
    byYieldId: Record<string, AugmentedYieldBalance[]>
    byValidatorAddress: Record<string, AugmentedYieldBalance[]>
  }
  validators: {
    byYieldId: Record<string, ValidatorDto[]>
    byAddress: Record<string, ValidatorDto>
  }
}
```

---

### 3. **Expensive Computations Not Memoized at Data Layer**

In `useYields.ts` (lines 47-173), the following happens on **every render** when `params` change:

1. Filter all yields by network/provider
2. Build `byId` index
3. Build `byAssetSymbol` grouping
4. Iterate all assets to build `symbolToAssetMap`
5. Compute `assetMetadata` for each symbol

**Impact:** O(n²) complexity when filtering + grouping ~500+ yields.

**Recommendation:** 
- Move index building to the `queryFn` (run once on fetch)
- Memoize filtered results separately from indices
- Consider using `createSelector` patterns from `reselect`

---

### 4. **Repeated Validator Lookups**

Multiple components do the same validator lookup pattern:

```typescript
// YieldEnterExit.tsx:147-182
const validatorMetadata = useMemo(() => {
  const foundInList = validators?.find(v => v.address === selectedValidatorAddress)
  if (foundInList) return foundInList
  const foundInBalances = balances?.find(b => b.validator?.address === selectedValidatorAddress)?.validator
  // ... fallbacks
}, [validators, selectedValidatorAddress, balances])

// YieldActionModal.tsx:102-117
const vaultMetadata = useMemo(() => {
  if (yieldItem.mechanics.type === 'staking' && validatorAddress) {
    const validator = validators?.find(v => v.address === validatorAddress)
    // ... same pattern
  }
}, [...])
```

**Impact:** O(n) lookup on every render across multiple components.

**Recommendation:** Create a `byAddress` index at fetch time:
```typescript
// In useYieldValidators
const validatorsByAddress = useMemo(() => 
  new Map(validators?.map(v => [v.address, v]) ?? []),
  [validators]
)
```

---

### 5. **`aggregateBalancesByType` Called 5 Times Per Render**

In `YieldPositionCard.tsx` (lines 91-125):

```typescript
const aggregateBalancesByType = (type: YieldBalanceType) => {
  const matchingBalances = balances?.filter((b) => { ... }) ?? []
  // ... reduce operations
}

const activeBalance = aggregateBalancesByType(YieldBalanceType.Active)
const enteringBalance = aggregateBalancesByType(YieldBalanceType.Entering)
const exitingBalance = aggregateBalancesByType(YieldBalanceType.Exiting)
const withdrawableBalance = aggregateBalancesByType(YieldBalanceType.Withdrawable)
const claimableBalance = aggregateBalancesByType(YieldBalanceType.Claimable)
```

**Impact:** 5 separate filter+reduce operations over the same array.

**Recommendation:** Single pass with grouping:
```typescript
const balancesByType = useMemo(() => {
  const grouped: Record<YieldBalanceType, AugmentedYieldBalance[]> = { ... }
  balances?.forEach(b => {
    if (matchesValidator(b)) grouped[b.type].push(b)
  })
  return Object.fromEntries(
    Object.entries(grouped).map(([type, items]) => [type, aggregate(items)])
  )
}, [balances, selectedValidatorAddress])
```

---

### 6. **`YieldsList` Re-computes Everything on Filter Change**

In `YieldsList.tsx`, the `yieldsByAsset` memo (lines 242-319) runs expensive operations:

```typescript
const yieldsByAsset = useMemo(() => {
  // Groups yields by symbol
  // Calculates userGroupBalanceUsd by iterating allBalances
  // Calculates maxApy, totalTvlUsd
  // Sorts the result
}, [displayYields, yields, allBalances, sortOption])
```

**Problem:** Changing `sortOption` triggers the ENTIRE grouping + aggregation, not just the sort.

**Recommendation:** Split into separate memos:
```typescript
const groupedYields = useMemo(() => /* grouping */, [displayYields, yields])
const enrichedGroups = useMemo(() => /* add balances */, [groupedYields, allBalances])
const sortedGroups = useMemo(() => /* sort only */, [enrichedGroups, sortOption])
```

---

## 🟡 Medium Issues

### 7. **Augmentation at Wrong Layer**

`augmentYield()` and `augmentYieldBalances()` are called:
- In `useYields` queryFn (good ✅)
- In `useYieldBalances` queryFn (good ✅)
- In `useAllYieldBalances` after fetch (duplicated work)

The augmentation adds `chainId` and `assetId` to tokens - this is deterministic and should happen ONCE.

---

### 8. **Provider Data Fetched Separately**

`useYieldProviders()` is called in multiple places:
- `YieldDetail.tsx`
- `YieldsList.tsx`
- `YieldEnterExit.tsx` (indirectly)

React Query caches this, but each component still does its own `getProviderLogo()` lookup.

**Recommendation:** Enrich yields with provider data at fetch time in `useYields`.

---

### 9. **`bnOrZero()` Called Excessively**

Pattern appears hundreds of times:
```typescript
bnOrZero(balance.amount).gt(0)
bnOrZero(y.rewardRate.total).times(100)
```

**Recommendation:** Pre-compute numeric fields during augmentation:
```typescript
type AugmentedYieldBalance = YieldBalance & {
  amountBn: BigNumber  // Pre-computed
  amountUsdBn: BigNumber
}
```

---

## 🟢 What's Working Well

1. **React Query caching** - Same query keys share cache
2. **`staleTime` settings** - Prevents unnecessary refetches
3. **Basic indices** (`byId`, `byAssetSymbol`) exist in `useYields`
4. **Augmentation pattern** - Good separation of API types vs app types

---

## 🦙 DefiLlama Comparison

### Key Architecture Differences

| Aspect | DefiLlama | ShapeShift Yields |
|--------|-----------|-------------------|
| **Data Source** | SSG/SSR via `getStaticProps` | Client-side React Query |
| **Filtering** | Pure functions over pre-fetched data | Mixed client-side + query params |
| **Multi-select filters** | URL query params with `Set` | Single-select dropdowns |
| **Filter persistence** | Saved filters in localStorage | None |
| **Normalization** | Server-side pre-processing | Client-side on every render |

### DefiLlama's Smart Patterns

#### 1. **Server-Side Pre-Processing**
```typescript
// queries/index.ts - Data is enriched ONCE at build time
export async function getYieldPageData() {
  let poolsAndConfig = await fetchApi([...])
  let data = formatYieldsPageData(poolsAndConfig)
  
  // Enrich with prices once
  const coinsPrices = await fetchCoinPrices(pricesList)
  for (let p of data.pools) {
    p['rewardTokensSymbols'] = /* computed once */
    p['rewardTokensNames'] = /* computed once */
  }
  
  // Pre-compute stablecoin list
  data['usdPeggedSymbols'] = usdPeggedSymbols
  
  return { props: data }
}
```

#### 2. **Set-Based Filtering (O(1) lookups)**
```typescript
// utils.ts - toFilterPool
const selectedProjectsSet = new Set(selectedProjects)
const selectedChainsSet = new Set(selectedChains)
const excludeTokensSet = new Set(excludeTokens)

// Fast O(1) checks
toFilter = toFilter && selectedProjectsSet.has(curr.projectName)
toFilter = toFilter && selectedChainsSet.has(curr.chain)
```

#### 3. **Multi-Select Filters with URL Persistence**
```typescript
// Filters/Chains.tsx
const setSelectedValue = (newChain) => {
  router.push({
    pathname,
    query: { ...queries, chain: newChain }
  }, undefined, { shallow: true })
}

// Supports: Deselect All, Select All, Select Only One
const clearAll = () => router.push({ query: { chain: 'None' } })
const toggleAll = () => router.push({ query: { chain: 'All' } })
const selectOnlyOne = (option) => router.push({ query: { chain: option } })
```

#### 4. **Saved Filter Presets**
```typescript
// Filters/index.tsx
function SavedFilters({ currentFilters }) {
  const { savedFilters, saveFilter, deleteFilter } = useYieldFilters()
  
  const handleLoad = (name) => {
    const filters = savedFilters[name]
    router.push({ pathname, query: filters }, undefined, { shallow: true })
  }
}
```

#### 5. **Clean Separation: Filter + Transform + Render**
```typescript
// index.tsx
const poolsData = useMemo(() => {
  // ONLY filtering happens here
  return pools.reduce((acc, curr) => {
    const toFilter = toFilterPool({ curr, ...filterParams })
    if (toFilter) {
      // Transform to table-friendly shape (no lookups)
      return acc.concat({
        pool: curr.symbol,
        configID: curr.pool,
        // ... pre-computed fields
      })
    }
    return acc
  }, [])
}, [pools, ...filterDeps])

// Table just renders - no computation
<YieldsPoolsTable data={poolsData} />
```

### UI/UX Features to Adopt

1. **Multi-select checkboxes in dropdowns** with search
2. **"Deselect All" / "Select All"** actions
3. **Token filter with include/exclude** capability
4. **Range filters** for TVL and APY (min/max)
5. **Columns toggle** to show/hide data columns
6. **"Save Current Filters"** persistence
7. **CSV Export** button
8. **"Reset all filters"** button
9. **Filter counts** in dropdown labels (e.g., "Chains (12)")

---

## 📋 Recommended Action Plan

| Priority | Action | Impact |
|----------|--------|--------|
| **P0** | Lift `useYieldBalances` to `YieldDetail`, pass via props | Eliminate 3 duplicate API calls |
| **P0** | Single-pass balance aggregation in `YieldPositionCard` | 5x fewer iterations |
| **P1** | Split `yieldsByAsset` memo into group/enrich/sort | Faster filter/sort changes |
| **P1** | Create validator `byAddress` index | O(1) lookups |
| **P1** | Implement multi-select filters (like DefiLlama) | Better UX |
| **P1** | Add filter persistence to URL params | Shareable links |
| **P2** | Pre-compute BigNumber fields in augmentation | Eliminate repetitive parsing |
| **P2** | Consider Redux slice for cross-page state | Better cache coherence |
| **P2** | Add saved filter presets | Power user feature |
| **P3** | Range filters for TVL/APY | Parity with DefiLlama |
| **P3** | CSV export | Data portability |

---

## Implementation Notes

### Converting to Multi-Select Filters

Current single-select:
```typescript
// YieldFilters.tsx
const handleNetworkChange = (network: string | null) => {
  setSearchParams(prev => {
    if (!network) prev.delete('network')
    else prev.set('network', network)
    return prev
  })
}
```

Multi-select approach:
```typescript
const handleNetworkChange = (networks: string[]) => {
  setSearchParams(prev => {
    if (networks.length === 0 || networks.includes('All')) {
      prev.delete('network')
    } else {
      prev.set('network', networks.join(','))
    }
    return prev
  })
}

// In filter logic
const selectedNetworksSet = useMemo(() => {
  const param = searchParams.get('network')
  if (!param || param === 'All') return null // no filter
  return new Set(param.split(','))
}, [searchParams])

const filteredYields = useMemo(() => {
  if (!selectedNetworksSet) return yields
  return yields.filter(y => selectedNetworksSet.has(y.network))
}, [yields, selectedNetworksSet])
```

### Saved Filters Pattern

```typescript
// hooks/useYieldFilters.ts
export const useYieldFilters = () => {
  const [savedFilters, setSavedFilters] = useLocalStorage<Record<string, URLSearchParams>>('yield-filters', {})
  
  const saveFilter = (name: string, filters: URLSearchParams) => {
    setSavedFilters(prev => ({ ...prev, [name]: Object.fromEntries(filters) }))
  }
  
  const deleteFilter = (name: string) => {
    setSavedFilters(prev => {
      const { [name]: _, ...rest } = prev
      return rest
    })
  }
  
  return { savedFilters, saveFilter, deleteFilter }
}
```
