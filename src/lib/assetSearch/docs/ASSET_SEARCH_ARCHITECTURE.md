# Asset Search Architecture

## Overview

The asset search system provides fuzzy search across all supported assets with intelligent grouping, deduplication, and ranking.

## Data Flow

```
User Input (search string)
    │
    ▼
┌─────────────────────────────────────┐
│  Fuse.js Fuzzy Search               │
│  (src/lib/assetSearch/utils.ts)     │
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
│  Ranking/Sorting                    │
│  - Symbol match quality             │
│  - Market cap                       │
│  - Primary asset priority           │
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
- `src/lib/assetSearch/utils.ts` - Fuzzy search utilities, symbol matching
- `src/lib/assetSearch/deduplicateAssets.ts` - Asset deduplication logic
- `src/lib/assetSearch/types.ts` - Type definitions for searchable assets

### UI Components
- `src/components/AssetSearch/AssetSearch.tsx` - Main search component
- `src/components/AssetSearch/components/AssetRow.tsx` - Individual/grouped row rendering
- `src/components/AssetSearch/components/GroupedAssetRow.tsx` - Expandable group with dropdown
- `src/components/AssetSearch/components/AssetChainDropdown.tsx` - Chain variant selector

### State/Selectors
- `src/state/slices/related-assets-selectors.ts` - Related asset selectors
- `src/state/slices/common-selectors.ts` - Common asset selectors

## Deduplication Strategy

### Purpose
When searching "USDC", we don't want to see 50+ individual USDC variants. We want one "USDC" group.

### How It Works (`deduplicateAssets.ts`)

1. **Group by `relatedAssetKey`**: All variants of the same token (USDC, AXLUSDC, USDC.E) share a key
2. **Select representative**: For each group, pick the best asset to display:
   - Prefer primary assets (`isPrimary: true`)
   - Prefer exact symbol matches to search query
   - Fall back to highest market cap

### Key Function
```typescript
export function deduplicateAssets(
  assets: SearchableAsset[],
  searchString: string
): SearchableAsset[]
```

## Symbol Matching

### Exact Match (`isExactSymbolMatch`)
```typescript
function isExactSymbolMatch(searchString: string, symbol: string): boolean
```
Case-insensitive comparison after normalization.

### Match Quality (`getSymbolMatchQuality`)
```typescript
function getSymbolMatchQuality(searchString: string, symbol: string): number
```
Returns:
- `2` = Exact match
- `1` = Starts with search string
- `0` = Contains or no match

Used for ranking search results.

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

## Search Ranking Priority

Results are sorted by:
1. **Symbol match quality** (exact > starts-with > contains)
2. **Primary asset status** (primary assets first within same match quality)
3. **Market cap** (higher market cap first)

## Testing

Test files:
- `src/lib/assetSearch/deduplicateAssets.test.ts`
- `src/lib/assetSearch/utils.test.ts`

Run tests:
```bash
yarn test src/lib/assetSearch
```

## Common Modifications

### Adding new search ranking criteria
Modify sorting logic in `deduplicateAssets.ts` or the search result processing.

### Changing grouping behavior
Modify `AssetRow.tsx`:
- Grouping condition: line ~270
- Related asset filtering: `filteredRelatedAssetIds` memo

### Adding new asset fields to search
Update `SearchableAsset` type in `types.ts` and Fuse.js configuration.
