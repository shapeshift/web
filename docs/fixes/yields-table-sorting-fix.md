# Yields Table Sorting Fix

## Issue

Sorting in the Yields list view was broken. Clicking a column header to sort would not visually update the row order. However, if the user toggled to grid view and back to list view, the rows would appear sorted correctly.

## Root Cause

TanStack Table's `useReactTable` hook returns a **stable table instance reference**. When sorting state changes:

1. `setAllSorting` updates React state
2. `YieldsList` component re-renders
3. `useReactTable` receives new `state: { sorting: allSorting }`
4. The table instance **mutates internally** but the **reference stays the same**
5. `YieldTable` component receives the same `table` prop reference
6. React's shallow comparison sees no prop change → `YieldTable` does not re-render
7. Stale rows remain displayed

The grid toggle "fixed" it because:
- Switching to grid unmounts `YieldTable`
- Switching back mounts a fresh `YieldTable`
- Fresh mount reads current `table.getRowModel().rows` which has sorted data

## Fix

Added a `key` prop to `YieldTable` that changes when sorting changes:

```tsx
<YieldTable
  key={allSorting.map(s => `${s.id}-${s.desc}`).join(',')}
  table={allTable}
  isLoading={isLoading}
  onRowClick={handleRowClick}
/>
```

When sorting state changes, the key changes, forcing React to remount `YieldTable` with fresh sorted data.

Applied to both table instances:
- `allTable` (All Yields tab)
- `positionsTable` (My Positions tab)

## Alternative Solutions Considered

1. **Pass `rows` directly instead of `table`** - Cleaner but requires refactoring header sort handlers
2. **Pass `sorting` as prop with `useMemo`** - More explicit dependency but adds prop drilling
3. **Key-based remount** - Chosen for minimal change, though causes unnecessary remounts

## Files Changed

- `src/pages/Yields/Yields.tsx`
