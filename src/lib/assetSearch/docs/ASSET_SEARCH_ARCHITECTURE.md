# Asset Search Architecture

## Overview

The asset search system provides fuzzy search across all supported assets with intelligent grouping, deduplication, and ranking. The search algorithm uses a score-based ranking approach similar to Uniswap's token search (exact match > prefix > contains).

## Data Flow

```
User Input (search string)
    │
    ▼
┌─────────────────────────────────────┐
│  Custom Score-Based Search          │
│  (src/lib/assetSearch/utils.ts)     │
│  - Symbol matching (exact/prefix)   │
│  - Name matching                    │
│  - AssetId/address matching         │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Deduplication                      │
│  (deduplicateAssets.ts)             │
│  - Groups by relatedAssetKey        │
│  - Picks best representative        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  AssetRow Component                 │
│  - Single row OR GroupedAssetRow    │
│  - Filters related assets by symbol │
└─────────────────────────────────────┘
    │
    ▼
User sees search results
```

## Key Files

### Search Logic
- `src/lib/assetSearch/utils.ts` - Score-based search, symbol matching
- `src/lib/assetSearch/deduplicateAssets.ts` - Asset deduplication logic
- `src/lib/assetSearch/shouldSearchAllAssets.ts` - Determines when to search all vs. primary assets
- `src/lib/assetSearch/types.ts` - Type definitions for searchable assets

### UI Components
- `src/components/AssetSearch/AssetSearch.tsx` - Main search component
- `src/components/AssetSearch/components/AssetRow.tsx` - Individual/grouped row rendering
- `src/components/AssetSearch/components/GroupedAssetRow.tsx` - Expandable group with dropdown
- `src/components/AssetSelection/components/AssetChainDropdown/AssetChainDropdown.tsx` - Chain variant selector

### State/Selectors
- `src/state/slices/related-assets-selectors.ts` - Related asset selectors
- `src/state/slices/common-selectors.ts` - Common asset selectors including `selectAssetsBySearchQuery`

### Workers
- `src/components/TradeAssetSearch/workers/assetSearch.worker.ts` - Web worker for trade asset search

## Search Algorithm

The search uses a custom score-based ranking system rather than fuzzy matching libraries like Fuse.js. This provides more predictable results for crypto asset searches where exact/prefix symbol matches should rank higher than fuzzy matches.

### Score Function (`scoreAsset`)

```typescript
function scoreAsset(asset: SearchableAsset, search: string): number {
  // Symbol matching (highest priority)
  if (symbol === search) return 0        // Exact match
  if (symbol.startsWith(search)) return 10  // Prefix match
  if (symbol.includes(search)) return 20    // Contains

  // Name matching
  if (name === search) return 30
  if (name.startsWith(search)) return 40
  if (name.includes(search)) return 50

  // AssetId/address matching (lowest priority)
  if (assetId.includes(search)) return 60

  return 1000  // No match (filtered out)
}
```

Lower scores = better matches. Results are sorted by score, with original order preserved for equal scores.

### Exact Symbol Match (`isExactSymbolMatch`)
```typescript
function isExactSymbolMatch(searchString: string, symbol: string): boolean
```
Case-insensitive comparison for determining exact symbol matches.

## Deduplication Strategy

### Purpose
When searching "USDC", we don't want to see 50+ individual USDC variants. We want one "USDC" group.

### How It Works (`deduplicateAssets.ts`)

1. **Group by `relatedAssetKey`**: All variants of the same token (USDC, AXLUSDC, USDC.E) share a key
2. **Select representative**: For each group, pick the best asset to display:
   - Prefer primary assets (`isPrimary: true`)
   - Prefer exact symbol matches to search query
   - Fall back to first asset in original order

### Key Function
```typescript
export function deduplicateAssets(
  assets: SearchableAsset[],
  searchString: string
): SearchableAsset[]
```

## Primary vs. All Assets Search

The system dynamically decides whether to search primary assets only (faster, cleaner results) or all assets (needed for specific searches).

### `shouldSearchAllAssets` Function

Returns `true` when:
- Search matches a **non-primary unique symbol** (e.g., "AXLUSDC", "VBUSDC")
- The matched symbol isn't just a primary symbol variant

This ensures searching "USDC" uses primary assets (shows one USDC group), while searching "AXLUSDC" uses all assets (shows the AXLUSDC variant).

## Grouping Behavior

### When Groups Appear
A `GroupedAssetRow` (with dropdown) appears when:
1. `showRelatedAssets` prop is true
2. `filteredRelatedAssetIds.length > 1`

### Filtering for Non-Primary Assets
When displaying a non-primary asset (e.g., AXLUSDC), the dropdown only shows same-symbol variants:
```typescript
if (!asset.isPrimary) {
  return relatedAsset.symbol === asset.symbol
}
```

This prevents AXLUSDC's dropdown from showing USDC or USDC.E.

## Worker vs. Selector

There are two search entry points with slightly different behavior:

### Web Worker (`assetSearch.worker.ts`)
Used for trade asset search with chain filtering.
```typescript
const useAllAssets =
  isContractAddressSearch ||
  activeChainId !== 'All' ||  // Chain-specific searches use all assets
  shouldSearchAllAssets(...)
```

### Selector (`selectAssetsBySearchQuery`)
Used for global search (header) which always searches across all chains.
```typescript
const useAllAssets =
  isContractAddressSearch ||
  shouldSearchAllAssets(...)  // No activeChainId check
```

## Testing

Test files:
- `src/lib/assetSearch/deduplicateAssets.test.ts`
- `src/lib/assetSearch/shouldSearchAllAssets.test.ts`
- `src/lib/assetSearch/utils.test.ts`

Run tests:
```bash
yarn test src/lib/assetSearch
```

## Common Modifications

### Adding new search ranking criteria
Modify `scoreAsset` function in `utils.ts`.

### Changing grouping behavior
Modify `AssetRow.tsx`:
- Grouping condition: check for `filteredRelatedAssetIds.length > 1`
- Related asset filtering: `filteredRelatedAssetIds` memo

### Adding new asset fields to search
Update `SearchableAsset` type in `types.ts` and add scoring logic in `scoreAsset`.

### Adjusting spam filtering
The `MINIMUM_MARKET_CAP_THRESHOLD` constant in `utils.ts` controls the minimum market cap to include in results.
