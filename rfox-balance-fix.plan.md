# rFOX Staking Balance Not Showing on First Mount

## Bug Summary

The rFOX staking page shows "0 FOX" with "$0.00" on first page load/wallet connection, even when the user has a staking balance. The correct balance appears after interacting with the UI (e.g., opening the unstake modal and clicking around). The issue is pre-existing and unrelated to the LP warning pill changes.

## How We Found This

While implementing changes to the LP sunset warning flow in `RFOXSection.tsx`, we noticed the staking balance wasn't loading correctly on first mount. We initially suspected our changes (context syncing, key props, form resets) were causing the issue, but after systematically reverting each change and verifying the staking balance display code is completely untouched in our diff, we confirmed it's a pre-existing bug.

### Changes we tried that did NOT cause this issue:
- Adding `showLpWarning` state and conditional LP warning card rendering
- Calling `setContextStakingAssetId` in click handlers (reverted to minimal — only when `showLpWarning` is true)
- Adding `key` props to `UnstakeModal`/`ClaimModal` (removed)
- Adding form reset logic in `UnstakeInput.tsx` on asset change

## Root Cause Analysis

### Data flow for staking balance display

1. `FoxPageProvider` (`src/pages/Fox/hooks/useFoxPageContext.tsx`) provides `assetAccountNumber`
2. `RFOXSection` uses `assetAccountNumber` + `selectAccountIdByAccountNumberAndChainId` to compute `stakingAssetAccountId`
3. `useStakingInfoQuery` is called with `accountId: isConnected ? stakingAssetAccountId : undefined`
4. The query uses `skipToken` when `accountId` is undefined, disabling the fetch

### The timing problem

On first mount:
1. Wallet auto-connects from persisted state (`isConnected = true`)
2. But account discovery hasn't completed yet — `selectAccountIdByAccountNumberAndChainId` returns an empty/incomplete map
3. `stakingAssetAccountId` resolves to `undefined`
4. The query passes `undefined` as `accountId` → query is disabled via `skipToken`
5. **The Skeleton incorrectly shows as loaded** because of how TanStack Query reports loading state for disabled queries

### The Skeleton bug (core issue)

```tsx
// src/pages/Fox/components/RFOXSection.tsx, ~line 401
<Skeleton isLoaded={!stakingBalanceCryptoPrecisionQuery.isLoading}>
  <Amount.Crypto value={stakingBalanceCryptoPrecisionQuery.data} ... />
</Skeleton>
```

In TanStack Query v5, a disabled query (using `skipToken`) has:
- `isPending = true` (no data yet)
- `isFetching = false` (not actively fetching — disabled)
- `isLoading = isPending && isFetching = false`

So `!isLoading` = `true` → Skeleton shows content → user sees "0 FOX" instead of a loading spinner.

The balance eventually appears when the user interacts with the modal because by then:
- Account discovery has completed
- Modal interactions trigger context updates → `RFOXSection` re-renders
- `stakingAssetAccountId` now has a value → query enables and fetches

## Steps to Reproduce

1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Start dev server: `yarn dev`
3. Navigate to the FOX page (`/fox`)
4. Connect a wallet that has rFOX staked
5. Observe: staking balance shows "0 FOX" / "$0.00"
6. Open the Unstake modal and interact with it (change asset, close, etc.)
7. Observe: staking balance on the main page now shows correctly

## Proposed Fix

### Option A: Account for disabled query state in Skeleton (Recommended)

The `Skeleton` should show as loading when the query is disabled AND we expect an account to be available. Replace the `isLoading` check with one that also accounts for the query being disabled:

```tsx
// RFOXSection.tsx — staking balance skeleton
<Skeleton isLoaded={!stakingBalanceCryptoPrecisionQuery.isLoading && stakingAssetAccountId !== undefined}>
```

Or more explicitly:

```tsx
const isStakingBalanceLoading = stakingBalanceCryptoPrecisionQuery.isLoading ||
  (isConnected && !stakingAssetAccountId)

<Skeleton isLoaded={!isStakingBalanceLoading}>
```

This same pattern should be applied to ALL Skeletons in `RFOXSection` that depend on `stakingAssetAccountId`:
- Staking balance (~line 401)
- Current epoch rewards (~line 369)
- Lifetime rewards (~line 421)
- Time in pool (~line 434)

### Option B: Use `isPending` instead of `isLoading`

TanStack Query's `isPending` is true whenever there's no data (whether disabled or loading). This would keep the Skeleton in loading state until data actually arrives:

```tsx
<Skeleton isLoaded={!stakingBalanceCryptoPrecisionQuery.isPending}>
```

Caveat: this would also show loading when the user is not connected (which may or may not be desired).

### Option C: Initialize `stakingAssetAccountId` eagerly

Instead of relying on effects to sync `stakingAssetAccountId`, compute it directly in the `FoxPageProvider` or `RFOXProvider` so it's available on first render. This is a larger refactor.

## Files Involved

- `src/pages/Fox/components/RFOXSection.tsx` — Skeleton loading states
- `src/pages/Fox/hooks/useFoxPageContext.tsx` — provides `assetAccountNumber`
- `src/pages/RFOX/hooks/useRfoxContext.tsx` — provides `stakingAssetAccountId` to modals
- `src/pages/RFOX/hooks/useStakingInfoQuery.ts` — staking balance query (uses `skipToken`)
- `src/state/slices/portfolioSlice/selectors.ts` — `selectAccountIdByAccountNumberAndChainId`
