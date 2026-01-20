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

### Score Constants

```typescript
const SCORE = {
  PRIMARY_NAME_EXACT: -10,    // Primary asset exact name match (e.g., "Bitcoin" → BTC)
  PRIMARY_SYMBOL_EXACT: -9,   // Primary asset exact symbol match (e.g., "btc" → BTC)
  PRIMARY_NAME_PREFIX: -6,    // Primary asset name prefix (e.g., "Bit" → Bitcoin)
  PRIMARY_SYMBOL_PREFIX: -6,  // Primary asset symbol prefix (e.g., "bt" → BTC)
  SYMBOL_EXACT: 0,            // Non-primary exact symbol match
  SYMBOL_PREFIX: 10,          // Symbol starts with search
  SYMBOL_CONTAINS: 20,        // Symbol contains search
  NAME_EXACT: 30,             // Exact name match
  NAME_PREFIX: 40,            // Name starts with search
  NAME_CONTAINS: 50,          // Name contains search
  ASSET_ID_CONTAINS: 60,      // AssetId/address contains search
  NO_MATCH: 1000,             // No match (filtered out)
} as const
```

### Score Function (`scoreAsset`)

```typescript
function scoreAsset(asset: SearchableAsset, search: string, originalIndex: number): number {
  // For primary assets, find the BEST score among all matches
  // PRIMARY_SYMBOL bonus requires: short symbol (≤5 chars) AND high market cap (top 500)
  // This filters spam tokens that copy popular symbols like BTC, ETH
  if (asset.isPrimary) {
    let bestScore = SCORE.NO_MATCH
    if (name === search) bestScore = Math.min(bestScore, SCORE.PRIMARY_NAME_EXACT)
    if (name.startsWith(search)) bestScore = Math.min(bestScore, SCORE.PRIMARY_NAME_PREFIX)
    const isHighMarketCap = originalIndex < 500
    if (symbol.length <= 5 && isHighMarketCap) {
      if (symbol === search) bestScore = Math.min(bestScore, SCORE.PRIMARY_SYMBOL_EXACT)
      if (symbol.startsWith(search)) bestScore = Math.min(bestScore, SCORE.PRIMARY_SYMBOL_PREFIX)
    }
    if (bestScore < SCORE.NO_MATCH) return bestScore
  }

  // Standard matching for non-primary assets (or primary assets without matches above)
  if (symbol === search) return SCORE.SYMBOL_EXACT
  if (symbol.startsWith(search)) return SCORE.SYMBOL_PREFIX
  if (symbol.includes(search)) return SCORE.SYMBOL_CONTAINS

  if (name === search) return SCORE.NAME_EXACT
  if (name.startsWith(search)) return SCORE.NAME_PREFIX
  if (name.includes(search)) return SCORE.NAME_CONTAINS

  if (assetId.includes(search)) return SCORE.ASSET_ID_CONTAINS

  return SCORE.NO_MATCH
}
```

### Sorting Logic

Lower scores = better matches. Results are sorted by:
1. **Primary sort**: Score (lower is better)
2. **Secondary sort** (non-primary assets only): Prefer assets with `relatedAssetKey` over orphans (helps legitimate bridged tokens rank above random LP/spam tokens)
3. **Tertiary sort**: Original array order (preserves market cap ordering)

### Spam Token Filtering

Primary assets get a scoring bonus, but with safeguards against spam:
- **Symbol length check**: PRIMARY_SYMBOL bonus only applies to symbols ≤5 chars (filters "BITCOIN", "ETHEREUM" spam tokens)
- **Market cap threshold**: PRIMARY_SYMBOL bonus only applies to top 500 assets by market cap (filters low-cap spam copying "BTC", "ETH")
- **Name matching**: PRIMARY_NAME bonus still applies to help legitimate assets like "Bitcoin" rank above spam

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
Two mechanisms filter spam tokens:
1. **Market cap threshold**: `MINIMUM_MARKET_CAP_THRESHOLD` in `utils.ts` (used in `common-selectors.ts`) sets minimum market cap to include in results
2. **Search scoring**: Primary assets only get symbol bonus if `originalIndex < 500` (market cap proxy) AND `symbol.length <= 5` (filters spam tokens with long symbols like "BITCOIN")
