# Yield.xyz Asset & Account Yield Section — Implementation Notes

## Context
This document captures how to add a Yield.xyz section to asset pages (both the global asset page and account-scoped asset page), inspired by the legacy DeFi section but aligned to the Yield.xyz UI system and data model. No code changes are included here.

The goal is to provide a clear implementation blueprint based on:
- Existing Yield.xyz integration in this repo.
- Existing legacy DeFi “Earn” UI patterns.
- Yield.xyz API semantics (from `yield_xyz_analysis.md` + integration docs).

## Existing Implementation Touchpoints

### Yield.xyz Integration (current)
- Types + augmentation: `src/lib/yieldxyz/types.ts`, `src/lib/yieldxyz/augment.ts`
- API client: `src/lib/yieldxyz/api.ts`
- React Query hooks: `src/react-queries/queries/yieldxyz/*`
- UI: `src/pages/Yields/*` (cards/rows, detail/enter/exit modal)
- Feature flag: `YieldXyz` in `src/state/slices/preferencesSlice/preferencesSlice.ts` using `VITE_FEATURE_YIELD_XYZ` from `src/config.ts`.

### Legacy DeFi Section (reference only)
- Account asset pages render DeFi table only when opportunities exist:
  - `src/pages/Accounts/AccountToken/AccountToken.tsx`
  - `src/components/AccountDetails.tsx`
- UI component: `src/components/StakingVaults/EarnOpportunities.tsx`
- Table UI: `src/components/StakingVaults/StakingTable.tsx`

## Requirements Recap
- Create a **new Yield.xyz section**, visually inspired by legacy DeFi rows but aligned to Yield.xyz design system.
- Show on **both asset page and account-asset page** (legacy only did account-asset).
- Show CTA even when no active position (if yields available for the asset).
- On asset page, show **account breakdown** similar to “Your Balance”.
- On account-asset page, show **the specific account’s balance**.
- If no yields for asset, **hide** section.
- Gate by existing Yield.xyz feature flag.
- Add a **new feature flag** `FEAT_YIELD_MULTI_ACCOUNT` (default false in `.env` and `.env.development`) to control fetching for accounts > 0.
  - With flag **off**, only account #0 is queried for Yield.xyz balances.

## Yield.xyz Data Semantics (Key Points)
- **Deposit asset matching** should use:
  - `inputTokens` (accepted deposit tokens), or
  - `token` (primary deposit token).
- **Balance tokens** returned by `/yields/{yieldId}/balances` are often receipt tokens (e.g., aUSDC), not the deposit asset.
- **Action flows**:
  - `POST /v1/actions/enter` creates a deposit action and returns transactions.
  - `YieldActionModal` already exists and consumes `ActionDto`.

## Asset-to-Yield Matching Strategy

### Primary Matching (preferred)
Match asset → yield if:
- `yield.inputTokens[].assetId` contains asset’s `assetId`, OR
- `yield.token.assetId` matches the asset’s `assetId`.

### Addressing Native Token Asset IDs
In `augmentYieldToken`, native tokens (no address) currently resolve `assetId` as `undefined`.
To support matching for native assets:
- Use `chainId` from yield network + `chainIdToFeeAssetId` to derive the native asset ID, OR
- Fallback to symbol+network matching if no assetId (only as a last resort).

### Yield Filtering
Only include yields where:
- `yield.status.enter` is true (for CTA).
- For active positions, include any yield with balances of type `active`, `entering`, `exiting`, `withdrawable`, or `claimable` where `amount > 0`.

## Feature Flags & Fetching Scope

### Flags
- **Existing**: `YieldXyz` (from `VITE_FEATURE_YIELD_XYZ`)
- **New**: `FEAT_YIELD_MULTI_ACCOUNT`
  - Default false in `.env` and `.env.development`.
  - When false, only account #0 is used for Yield.xyz balance queries.

### Fetching Behavior
Use existing hooks where possible:
- `useYields({ network })`: load available yields.
- `useAllYieldBalances()`: batch balances across networks and addresses.

When `FEAT_YIELD_MULTI_ACCOUNT` is false:
- Only request balances for account #0 addresses.
- Asset page “account breakdown” will have at most one row.

When true:
- Allow all account IDs for the asset’s chain.

## UI Surface Behavior

### Asset Page (global asset view)
Target: `src/components/AssetAccountDetails/AssetAccountDetails.tsx`

Render a Yield.xyz section that includes:
- Title + description (align to Yield.xyz styles).
- **Account breakdown rows** (similar to “Your Balance” component):
  - Each row is an account with balances for matching yields.
  - If only account #0 is queried, this will be a single row.
- CTA state if no active positions:
  - “Deposit into {best yield}” or “Start earning”.

### Account Asset Page
Target: `src/pages/Accounts/AccountToken/AccountToken.tsx`

Render a Yield.xyz section that includes:
- Title + description.
- Yield rows scoped to the current account.
- CTA if no active positions for that account (but yields are available).

### When to Hide
Hide the entire section if:
- Yield.xyz feature flag is off, OR
- No matching yields exist for the asset.

## CTA & Navigation Behavior

### Active Positions
Clicking an active row should take the user to a detail view for that yield:
- Prefer `/yields/:yieldId` detail page (existing implementation).
- Alternative: if context is account page, route to asset page and focus that account’s yield row (if we add a query param filter later).

### CTA for New Positions
If no active positions:
- Prefer opening enter flow directly (if possible):
  - `YieldActionModal` currently expects amount input; it is not yet an “empty” modal.
  - The safer path is to route to `/yields/:yieldId` and open the enter flow there.

## Suggested Component Structure (No Code)

### New Components
- `YieldAssetSection` (wrapper card/section)
- `YieldAssetRow` (row similar to legacy DeFi row, using Yield.xyz styling)
- `YieldAccountBreakdownRow` (mirrors “Your Balance” layout but yield-specific)

### Data Hooks (potential)
- `useYieldOpportunitiesForAsset(assetId)`
  - Returns matching yields (via `useYields` + asset match).
- `useYieldBalancesForAssetAndAccount(assetId, accountId)`
  - Returns balances for yields matching the asset.

## Display Logic (High Level)

1. Load Yield.xyz yields.
2. Match yields to asset using input token or primary token.
3. Fetch balances (account-scoped or aggregated).
4. Split into:
   - `activePositions` (balances > 0).
   - `availableYields` (enterable yields).
5. Render:
   - If `activePositions` > 0 → show rows + balances.
   - Else if `availableYields` > 0 → show CTA.
   - Else → hide section.

## Design Notes for Handoff
- Base on legacy DeFi table layout but make it visually closer to Yield.xyz cards/rows.
- Keep CTA style similar to Yield.xyz “Enter” actions (use existing card styling).
- Ensure the section feels native within Yield.xyz design system, not the old DeFi system.

## Open Decisions (for next agent)
- CTA behavior: pick best yield by APY vs show list/selector.
- Row click routing: yield detail vs enter modal vs in-place flow.
- Whether to show per-yield APY or per-asset “up to X%” summary.
- Whether to show receipt token vs deposit token in rows.

## Key References
- `yield_xyz_analysis.md`: Yield.xyz API overview and endpoints.
- `YIELD_XYZ_INTEGRATION.md`: prior spike + UX patterns.
- `src/pages/Yields/*`: existing Yield.xyz UI components.
- Legacy DeFi reference: `src/components/StakingVaults/EarnOpportunities.tsx`.
- Yield.xyz API references:
  - https://docs.yield.xyz/reference/yieldscontroller_getyields
  - https://docs.yield.xyz/reference/yieldscontroller_getyield
  - https://docs.yield.xyz/reference/providerscontroller_getproviders
  - https://docs.yield.xyz/reference/yieldscontroller_getaggregatebalances
  - https://docs.yield.xyz/reference/yieldscontroller_getyieldbalances
  - https://docs.yield.xyz/reference/actionscontroller_manageyield
  - https://docs.yield.xyz/reference/actionscontroller_enteryield
  - https://docs.yield.xyz/reference/actionscontroller_exityield
