# TanStack Table v8 vs. current Yield list/card implementation

## Context snapshot (current implementation)
- List/grid toggle is hand-rolled in `src/pages/Yields/Yields.tsx` using local `viewMode` state and conditional render.
- Grid renders `YieldCard` items (`src/pages/Yields/components/YieldCard.tsx`) in a `SimpleGrid`.
- List renders `YieldRow` items (`src/pages/Yields/components/YieldRow.tsx`) in a `Flex`-based container with a custom `ListHeader` (`src/pages/Yields/components/YieldViewHelpers.tsx`).
- There is no virtualization or pagination; every item renders on each view toggle.
- `useAllYieldBalances` is fetched unconditionally for the page, even though it only drives the "My Positions" tab and the overview.

## Existing table infra in this repo (not used by Yield views)
- `src/components/ReactTable/ReactTable.tsx` (react-table v7): pagination, sorting, row expansion.
- `src/components/ReactTable/InfiniteTable.tsx` (react-table v7 + `react-virtuoso`): row virtualization, visible row callbacks, expansion.
- `src/components/MarketTableVirtualized/MarketsTableVirtualized.tsx`: established pattern for "list on mobile, virtualized table on desktop".
- The repo already depends on both `react-table` v7 and `@tanstack/react-table` v8 (see `package.json`), but v8 is not used in `src`.

## TanStack Table v8 highlights (performance + reuse)
- Headless, memoized row model with explicit pipelines: `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`.
- `getRowId` for stable row identity (critical for performant re-renders and virtualization).
- Easy integration with virtualization libraries (`@tanstack/react-virtual` is the first-party choice, `react-virtuoso` works too).
- Columns can carry `meta` to share formatting rules across list and card renderers without duplicating logic.
- Fully controlled state for sorting/filtering/pagination, so view toggles can share one table state.

## Where the current Yield list/card could improve
1. **Virtualization for large lists**
   - Current list/grid renders every item. `InfiniteTable` already solves this for list views using `react-virtuoso`.
   - For grid, a virtualized grid (e.g., `@tanstack/react-virtual` with lanes or `VirtuosoGrid`) would reduce DOM cost.
2. **Avoid duplicated column logic**
   - `YieldRow` and `YieldCard` both compute APY, tags, TVL formatting separately.
   - A TanStack v8 column model (or existing v7 column definitions) could centralize accessors and formatting.
3. **Reduce unnecessary fetching**
   - `useAllYieldBalances` is always fetched, even if the "My Positions" tab is never opened.
   - Consider lazy-loading balances only when that tab becomes active.
4. **Render stability**
   - Handlers like `onEnter={() => handleYieldClick(yieldItem.id)}` are recreated per render.
   - Not a blocker, but `useCallback` or a memoized row component can reduce churn.

## Options to “not reinvent the wheel”

### Option A: Reuse existing v7 table infra for list view (lowest churn)
- Use `InfiniteTable` for the list view and keep `YieldCard` for the grid view.
- Column defs live in a single place and can be reused later if you migrate to v8.
- Gets virtualization immediately without new dependencies or a migration.

### Option B: Adopt TanStack Table v8 for Yield list + grid
- Define columns once with `@tanstack/react-table`.
- List view renders rows in a table (or `Flex`) using `table.getRowModel().rows`.
- Grid view renders cards from the same row model; sorting/filtering/pagination still work.
- Add `@tanstack/react-virtual` for list/grid virtualization.
- This avoids building custom list logic and keeps view switching to a single table state.

### Option C: Unify v7 and v8 (longer-term)
- Migrate `ReactTable` / `InfiniteTable` wrappers to v8 to standardize table usage across the app.
- This is a larger effort but avoids dual-table stacks and enables consistent performance patterns.

## Suggested direction (performance-first, minimal reinvention)
1. **Short term**: Use `InfiniteTable` for the Yield list view, keep cards for grid.
   - Reuses existing virtualized table + Chakra styling.
   - No migration required.
2. **Medium term**: Introduce a TanStack v8 row model for Yields only.
   - Use it as the shared data model for both list and card.
   - Add `@tanstack/react-virtual` to virtualize list (and grid if needed).
3. **Long term**: Consolidate on v8 and retire v7 wrappers if the rest of the codebase moves.

## Quick checklist of concrete perf wins
- Virtualize list rows with `InfiniteTable` or `@tanstack/react-virtual`.
- Lazy-load `useAllYieldBalances` when the "My Positions" tab is activated.
- Memoize `YieldCard` / `YieldRow` and provide stable row IDs.
- Centralize APY/TVL/tag formatting in a column or helper layer to avoid duplicate work.

