# Asset Search Grouping System

## Overview

The asset search supports grouping related assets (same token across multiple chains) into expandable dropdown rows. This provides a cleaner UX where users see one row per token type with the ability to expand and select a specific chain variant.

## Key Concepts

### Primary vs Non-Primary Assets

- **Primary assets**: The "canonical" version of a token (e.g., USDC on Ethereum). Has `isPrimary: true`
- **Non-primary assets**: Bridged or wrapped variants (e.g., AXLUSDC, USDC.E). Has `isPrimary: false`

### Related Assets

Assets are linked via `relatedAssetKey` in the asset data. All variants of USDC (USDC, AXLUSDC, USDC.E, etc.) share the same `relatedAssetKey`, allowing them to be grouped.

## How Grouping Works

### File: `src/components/AssetSearch/components/AssetRow.tsx`

The `AssetRow` component decides whether to render a single asset row or a grouped row with dropdown.

**Grouping condition** (line ~270):
```typescript
if (showRelatedAssets && filteredRelatedAssetIds.length > 1) {
  return <GroupedAssetRow ... />
}
```

### Filtering Logic for Non-Primary Assets

For non-primary assets like AXLUSDC, the `filteredRelatedAssetIds` memo (lines 113-139) filters related assets to only include **same-symbol variants**:

```typescript
const filteredRelatedAssetIds = useMemo(() => {
  return relatedAssetIds.filter(relatedAssetId => {
    // ... chain/asset predicate checks ...

    // For non-primary assets, only include related assets with the same symbol
    if (!asset.isPrimary) {
      const relatedAsset = assetsById[relatedAssetId]
      return relatedAsset.symbol === asset.symbol
    }
    return true
  })
}, [...])
```

This ensures:
- Searching "USDC" shows USDC with dropdown containing all USDC variants (USDC, AXLUSDC, USDC.E, etc.)
- Searching "AXLUSDC" shows AXLUSDC with dropdown containing only AXLUSDC on different chains
- Searching "USDC.E" shows USDC.E with dropdown containing only USDC.E on different chains

## Search Behavior Examples

| Search Query | Result |
|-------------|--------|
| `usdc` | USDC group (all variants in dropdown) |
| `axlusdc` | AXLUSDC group (AXLUSDC chains only in dropdown) |
| `axlusdt` | AXLUSDT group (AXLUSDT chains only in dropdown) |
| `usdc.e` | USDC.E group (USDC.E chains only in dropdown) |
| `vbusdc` | Single row (only one chain variant exists) |

## Related Files

- `src/components/AssetSearch/components/AssetRow.tsx` - Main row component with grouping logic
- `src/components/AssetSearch/components/GroupedAssetRow.tsx` - Expandable grouped row component
- `src/components/AssetSearch/components/AssetChainDropdown.tsx` - Chain selector dropdown
- `src/lib/assetSearch/deduplicateAssets.ts` - Deduplication logic for search results
- `src/state/slices/related-assets-selectors.ts` - Selectors for related asset data

## Common Issues & Solutions

### Issue: Non-primary symbol search shows single row instead of group

**Cause**: The grouping condition was incorrectly skipping groups for exact non-primary symbol matches.

**Solution**: Removed the `isSearchingForUniqueNonPrimarySymbol` check. The `filteredRelatedAssetIds` filtering already handles showing only same-symbol variants, so no additional check is needed.

### Issue: Duplicate groups appearing in search results

**Cause**: Deduplication was happening by `assetId` instead of `relatedAssetKey`.

**Solution**: Use `relatedAssetKey` for deduplication in `deduplicateAssets.ts`.
