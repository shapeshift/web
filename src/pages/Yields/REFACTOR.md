# YieldXYZ Refactoring Plan

## Current State: 9311 lines across ~40 files

### Problems Identified

1. **Component Explosion** - 4 components doing the same thing:
   - `YieldCard` (223 lines) - single yield grid view
   - `YieldAssetCard` (292 lines) - asset group grid view
   - `YieldAssetRow` (111 lines) - single yield list view
   - `YieldAssetGroupRow` (183 lines) - asset group list view
   - **Total: 809 lines** for what should be ~150 lines

2. **Hook Wrapper Hell** - Redundant normalization layers:
   - `useYieldBalances` (207 lines) - re-aggregates what useAllYieldBalances already has
   - `useValidatorBalances` (88 lines) - enriches validators (should be in useAllYieldBalances)
   - `useYieldOpportunities` (81 lines) - filters yields (should just use useYields)
   - **Total: 376 lines** that can be deleted

3. **Duplicate Aggregation Logic** - Same code in 3+ places:
   - YieldsList lines 231-291: groups yields by asset, calculates maxApy/tvl
   - YieldAssetCard lines 53-78: same calculation
   - YieldAssetGroupRow lines 46-68: same calculation
   - **~107 lines** of duplicated reduce/map logic

4. **256 useMemo calls** - Most are trivial:
   - Property access: `useMemo(() => obj.prop, [obj])`
   - Simple math: `useMemo(() => x * 100, [x])`
   - Ternaries: `useMemo(() => a ? b : c, [a])`
   - **~200 lines** can be deleted

---

## Execution Plan

### Phase 1: Normalize Data in Hooks

#### 1.1 Enhance `useYields` to return pre-aggregated asset groups

Add `YieldAssetGroup` type to `types.ts`:
```typescript
export type YieldAssetGroup = {
  symbol: string
  name: string
  icon: string
  assetId?: string
  yields: AugmentedYieldDto[]
  count: number
  maxApy: number
  totalTvlUsd: string
  providerIds: string[]
  chainIds: string[]
}
```

Modify `useYields` to compute `assetGroups` in its useMemo and return it.

**Result**: Delete 60-line grouping logic from YieldsList + delete stats computation from YieldAssetCard/YieldAssetGroupRow

#### 1.2 Move validator enrichment into `useAllYieldBalances`

Currently `useValidatorBalances` takes validators + balances and enriches them.
Move this into `useAllYieldBalances` so it returns:
```typescript
{
  byYieldId: Record<string, Balance[]>,
  aggregated: Record<string, YieldBalanceAggregate>,
  enrichedValidators: ValidatorWithBalance[]  // NEW
}
```

**Result**: Delete `useValidatorBalances.ts` (88 lines)

#### 1.3 Delete `useYieldBalances`

This hook just filters `useAllYieldBalances` by yieldId and re-aggregates.
The aggregation already happens in `useAllYieldBalances.aggregated`.
Components should use `useAllYieldBalances` directly with a select option.

**Result**: Delete `useYieldBalances.ts` (207 lines)

#### 1.4 Delete `useYieldOpportunities`

This hook filters yields by assetId and gets balances.
Replace with direct usage of `useYields` + `useAllYieldBalances`.

**Result**: Delete `useYieldOpportunities.ts` (81 lines)

---

### Phase 2: Consolidate Components

#### 2.1 Create unified `YieldItem` component

Replace 4 components with 1:
```typescript
type YieldItemProps = {
  // Either a single yield or a group
  data: AugmentedYieldDto | YieldAssetGroup
  variant: 'card' | 'row'
  onClick?: () => void
  balance?: string // user's balance in this yield/group
}
```

Component internally detects if `data` is single or group and renders appropriately.

**Result**: Delete `YieldCard.tsx`, `YieldAssetCard.tsx`, `YieldAssetRow.tsx`, `YieldAssetGroupRow.tsx` (~809 lines) → Replace with `YieldItem.tsx` (~200 lines)

#### 2.2 Use `GradientApy` component everywhere

Already exists but not used consistently. Replace all inline gradient text.

---

### Phase 3: Clean Up Trivial Memoization

Remove useMemo for:
- Property access: `const x = obj.prop` (not `useMemo(() => obj.prop, [obj])`)
- Simple booleans: `const x = a || b`
- Simple ternaries: `const x = a ? b : c`
- Simple math on primitives: `const x = a * 100`

Keep useMemo for:
- Array operations (map, filter, reduce) on large datasets
- Object creation that's passed to memoized children
- Expensive computations

---

## Expected Savings

| Category | Current | After | Saved |
|----------|---------|-------|-------|
| Yield display components | 809 | 200 | 609 |
| Wrapper hooks | 376 | 0 | 376 |
| Duplicate aggregation | 107 | 0 | 107 |
| Trivial useMemo | ~200 | 0 | 200 |
| **Total** | | | **~1292 lines** |

---

## Files to Delete
- `src/react-queries/queries/yieldxyz/useYieldBalances.ts`
- `src/react-queries/queries/yieldxyz/useValidatorBalances.ts`
- `src/pages/Yields/hooks/useYieldOpportunities.ts`
- `src/pages/Yields/components/YieldCard.tsx`
- `src/pages/Yields/components/YieldAssetCard.tsx`
- `src/pages/Yields/components/YieldAssetRow.tsx`
- `src/pages/Yields/components/YieldAssetGroupRow.tsx`

## Files to Create
- `src/pages/Yields/components/YieldItem.tsx` (unified component)

## Files to Modify
- `src/react-queries/queries/yieldxyz/useYields.ts` (add assetGroups)
- `src/react-queries/queries/yieldxyz/useAllYieldBalances.ts` (add enrichedValidators)
- `src/pages/Yields/components/YieldsList.tsx` (use normalized data)
- `src/pages/Yields/YieldAssetDetails.tsx` (use normalized data)
- `src/pages/Yields/components/YieldValidatorSelectModal.tsx` (use enrichedValidators)
- `src/pages/Yields/components/YieldActivePositions.tsx` (use YieldItem)
- Various components (remove trivial useMemo)
