# Contract Address Search - Related Assets & Ungrouped Display

## ✅ COMPLETED

**Status:** Fixed and implemented
**Date:** 2025-10-17
**Closes:** [#10841](https://github.com/shapeshift/web/issues/10841)

> *"In this farewell, there's no blood, there's no alibi"* - A reflection on what we've built.

### What This PR Fixes

Two birds one stone:

1. **Fixed related assets search by contract address** - Broken in both global and trade asset search
2. **Ensures contract address searches are ungrouped**:
   - Trade asset search: Always ungrouped, displays the one variant (primary or specific related) regardless of chain narrowing
   - Global asset search: Always ungrouped, displays the one variant

### Implementation

1. ✅ Created shared contract address detection utilities (`isContractAddress.ts`, `isEvmAddress.ts`, `isSolanaAddress.ts`)
2. ✅ Updated global search selector to use all assets for contract address searches
3. ✅ Updated trade search worker to use all assets for contract address searches
4. ✅ Added ungrouped display logic for contract address searches
5. ✅ Replaced nested ternary with IIFE pattern in worker
6. ✅ Preserved existing UX for name/symbol searches (primary assets only, grouped)

### Key Changes

1. **Contract address detection** - Uses viem's `isAddress` for EVM + Solana `PublicKey` validation
2. **Asset pool selection** - Contract address searches use ALL assets, name/symbol searches use PRIMARY assets on "All"
3. **Ungrouped display** - Contract address results show ungrouped, name/symbol results show grouped by related assets
4. **Code quality** - Replaced nested ternary with IIFE pattern in worker

### Files Modified
- `/src/lib/utils/isSolanaAddress.ts` - Moved from TradeAssetSearch/helpers
- `/src/lib/utils/isContractAddress.ts` - New unified contract address detection utility
- `/src/lib/utils/isEvmAddress.ts` - Replaced custom regex with viem's `isAddress`
- `/src/state/slices/common-selectors.ts` - Updated `selectAssetsBySearchQuery`
- `/src/components/TradeAssetSearch/workers/assetSearch.worker.ts` - Updated `handleSearch` with IIFE pattern
- `/src/components/TradeAssetSearch/components/SearchTermAssetList.tsx` - Ungrouped display for contract address searches
- `/src/components/Layout/Header/GlobalSearch/AssetResults/AssetResults.tsx` - Ungrouped display for contract address searches
- `/src/components/TradeAssetSearch/hooks/useGetCustomTokensQuery.tsx` - Updated imports
- `/src/lib/assetSearch/utils.ts` - Updated imports
- `/src/components/StakingVaults/PositionTable.tsx` - Updated imports
- Deleted: `/src/components/TradeAssetSearch/helpers/customAssetSearch.ts` (obsolete)
- Deleted: `/src/lib/utils/ethAddress.ts` (replaced by isEvmAddress.ts)

### Safety Guarantees

**What Changed:**
- Only contract address searches affected
- Name/symbol searches unchanged (still use PRIMARY_ASSETS on "All")

**What's Preserved:**
- ✅ Chain filtering logic intact
- ✅ Market cap filtering intact
- ✅ Spam filtering intact
- ✅ Balance aggregation unchanged
- ✅ Portfolio views unchanged

**Performance:**
- Contract address detection: O(1) regex/validation check
- No additional loops or iterations
- Worker already caches both asset lists
- Only applies to explicit contract address searches

---

## Context

**Related Issues:**
- [#10840 - Solana Contract Address search in To/From asset is broken](https://github.com/shapeshift/web/issues/10840) - Fixed in [PR #10842](https://github.com/shapeshift/web/pull/10842)
- [#10841 - Contract address searches should be ungrouped](https://github.com/shapeshift/web/issues/10841) - Fixed in this PR

**Stack:**
- [PR #10842](https://github.com/shapeshift/web/pull/10842) - Added `assetId` to search config (fixes #10840)
- **This PR** - Stacked on #10842, fixes related assets search and ungrouped display (closes #10841)

### What Was Fixed in PR #10842

Added `assetId` field to trade search config so contract addresses in assetIds could be matched.

### What This PR Fixes

#### Issue 1: Related Assets Not Searchable by Contract Address

When "All" chains selected, only PRIMARY_ASSETS were searched. Related assets (e.g., FOX on Arbitrum with `isPrimary: false`) weren't in the search pool.

**Solution:**
- Detect contract address searches using `isContractAddress()` (combines EVM + Solana validation)
- Use ALL assets for contract address searches (unique identifiers, no duplicates)
- Use PRIMARY assets for name/symbol searches on "All" (avoid showing grouped duplicates)

#### Issue 2: Contract Address Results Were Grouped

Contract address searches showed grouped/related assets instead of the specific variant.

**Solution:**
- Added `!isContractAddress()` check to `showRelatedAssets` prop
- Trade search: Always ungrouped for contract addresses
- Global search: Always ungrouped for contract addresses

---

## Related Assets Index

**Selector:** `selectRelatedAssetIdsByAssetIdInclusive` (`common-selectors.ts:172-186`)

This builds a mapping of primary asset IDs to all their related asset IDs:
```typescript
{
  [foxEthAssetId]: [foxEthAssetId, foxArbAssetId, foxPolyAssetId, ...],
  [foxArbAssetId]: [foxEthAssetId, foxArbAssetId, foxPolyAssetId, ...],
  // ...
}
```

Used for aggregating balances across chains and finding chain-specific variants.

---

## Performance Considerations

**Concern:** Searching all assets instead of primaries might be slower.

**Analysis:**
- Only applies to contract address searches (detected via regex/validation)
- Contract address searches are exact matches, not fuzzy
- `matchSorter` with `CONTAINS` threshold on assetId is fast
- Chain filtering still reduces the search space
- Worker already has both asset lists cached

**Recommendation:** Acceptable tradeoff for correct functionality.

---

## Alternative Solutions Considered

### Alternative 1: Expand Primary Assets on "All"
**Idea:** Include all related assets in PRIMARY_ASSETS when "All" selected.

**Rejected because:**
- Would show duplicate assets in default view (bad UX)
- Increases memory usage in worker
- Doesn't solve global search issue

### Alternative 2: Post-Search Related Asset Expansion
**Idea:** After search, if no results, search related assets.

**Rejected because:**
- More complex logic
- Two search passes (performance hit)
- Doesn't handle case where primary exists but user wants related

### Alternative 3: Separate Contract Address Search Path
**Idea:** Bypass normal search for contract addresses, lookup directly.

**Rejected because:**
- Requires maintaining separate lookup index
- Duplicates logic
- Doesn't integrate well with existing search flow

---

## Conclusion

The root cause is a mismatch between:
1. **Search config** - Fixed by adding `assetId` to searchable fields
2. **Asset pool selection** - Needs fix to use all assets for contract address searches

Contract addresses are unique identifiers that should always search the full asset set, regardless of chain filter, to ensure users can find the specific asset they're looking for.
