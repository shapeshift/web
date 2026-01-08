# Yields Feature Code Review

## HIGH PRIORITY

### 1. Change network field type from string to YieldNetwork in types.ts
In `src/lib/yieldxyz/types.ts`, change all `network: string` fields to `network: YieldNetwork`.
Lines to update: 68, 124, 254, 405.

### 2. Replace magic network strings with YieldNetwork enum
Replace all `yieldItem.network === 'solana'` etc with `yieldItem.network === YieldNetwork.Solana`.

Files:
- `src/pages/Yields/components/YieldEnterExit.tsx:226` - `'sui'` → `YieldNetwork.Sui`
- `src/pages/Yields/hooks/useYieldTransactionFlow.ts:159-162` - `'solana'`, `'tron'`, `'monad'`, `'sui'`

Import `YieldNetwork` from `@/lib/yieldxyz/types`.

### 3. Add untranslated UI strings to en/main.json
Add to `yieldXYZ` section in `src/assets/translations/en/main.json`:

```json
"loadingQuote": "Loading Quote...",
"depositing": "Depositing...",
"withdrawing": "Withdrawing...",
"selectValidator": "Select Validator",
"allValidators": "All Validators",
"myValidators": "My Validators",
"noValidatorsFound": "No validators found",
"preferred": "Preferred",
"startEarning": "Start Earning",
"pending": "Pending",
"ready": "Ready",
"highestApy": "Highest APY",
"lowestApy": "Lowest APY",
"highestTvl": "Highest TVL",
"lowestTvl": "Lowest TVL",
"nameAZ": "Name (A-Z)",
"allNetworks": "All Networks",
"allProviders": "All Providers",
"showAll": "Show All",
"searchValidator": "Search for validator",
"depositYourToken": "Deposit your %{symbol} to start earning yield securely.",
"noActiveValidators": "You don't have any active validators yet.",
"confirming": "Confirming...",
"signNow": "Sign now...",
"waiting": "Waiting",
"done": "Done"
```

Then update files to use translate(): YieldActionModal.tsx, YieldValidatorSelectModal.tsx, YieldPositionCard.tsx, YieldEnterExit.tsx, YieldFilters.tsx

### 5. Remove stale validatorMetadata fallback block in YieldStats.tsx
The `validatorMetadata` IIFE has stale fallback logic with wrong addresses and hardcoded names.
Remove the fallback block, keep only:
```typescript
const validatorMetadata = (() => {
  if (yieldItem.mechanics.type !== 'staking') return null
  if (selectedValidator) return { name: selectedValidator.name, logoURI: selectedValidator.logoURI }
  return null
})()
```

### 11. UI Bug: Missing headers in "All" list view on /yields
In `http://localhost:3000/#/yields` with list view, the "All" tab is missing column headers (YIELD, APY, TVL).
The "My Position" tab shows headers correctly. Need to add headers to the All tab list view.

### 12. UI Bug: Missing USD value for active positions in list views
- `/yields` "My Position" tab - shows APY/TVL but missing USD value for user's active balance
- `/yields/asset/<symbol>` list view - missing USD value column for user's position
- Should show USD value for active positions same as card view does (e.g., "My Balance: $5.85")

---

## MEDIUM PRIORITY

### 4. Fix type error in YieldStats.tsx
Line 88: `Property 'rewardRate' does not exist on type 'ValidatorDto | YieldBalanceValidator'`
Add `rewardRate` to `YieldBalanceValidator` type in types.ts with proper typing.

### 6. Add TODO comment about precision amounts
In `src/pages/Yields/hooks/useYieldTransactionFlow.ts`, replace lines 157-164 with:

```typescript
// TODO(gomes): This precision vs base unit split is likely unnecessary.
// The yield.xyz API docs say "valid decimal number" for ALL networks, suggesting
// they all expect precision amounts (e.g., "1.5" not "1500000").
//
// Current behavior:
// - Solana, Tron, Monad, Sui → precision amount (e.g., "1.5")
// - EVM, Cosmos → base unit (e.g., "1500000000000000000")
//
// If all networks use precision, simplify to:
//   const args: Record<string, unknown> = { amount }
//
// Note: For Cosmos, we build the tx locally via cosmosStakeArgs anyway,
// so the API amount might not even matter. Test with EVM yields first.
const PRECISION_AMOUNT_NETWORKS = new Set([
  YieldNetwork.Solana,
  YieldNetwork.Tron,
  YieldNetwork.Monad,
  YieldNetwork.Sui,
])
const usesPrecisionAmount = PRECISION_AMOUNT_NETWORKS.has(yieldItem.network)
const yieldAmount = usesPrecisionAmount ? amount : toBaseUnit(amount, yieldItem.token.decimals)
const args: Record<string, unknown> = { amount: yieldAmount }
```

### 8. Fix as any casts in YieldEnterExit.tsx
Lines 317, 319 use `(validatorMetadata as any).rewardRate`.
Fix by properly typing `validatorMetadata` to include `rewardRate?: { total: number }`.

---

## LOW PRIORITY

### 7. Delete unused components
Delete these files (0 usages found):
- `src/pages/Yields/components/YieldAccountBreakdown.tsx`
- `src/pages/Yields/components/YieldOverview.tsx`
- `src/pages/Yields/components/YieldRow.tsx`

### 9. Fix @ts-ignore in api.ts
Line 40 has `@ts-ignore` for networks.join(). Fix by typing the param properly:
```typescript
if (params?.networks && Array.isArray(params.networks)) {
  (queryParams as Record<string, string>).networks = params.networks.join(',')
}
```

### 10. Rename yield: prop to yieldItem:
In `YieldRow.tsx:21` and `YieldCard.tsx:23`, rename `yield:` prop to `yieldItem:` for consistency (yield is a reserved word).

---

## NOTES

### Large Components (consider splitting later)
- `YieldsList.tsx` (667 lines) - handles filtering, sorting, tabs, grid/list view
- `YieldActionModal.tsx` (610 lines) - transaction flow UI, status cards
- `YieldEnterExit.tsx` (556 lines) - enter/exit tabs, validator selection

### Existing TODOs in codebase
- `YieldsList.tsx:102` - "TODO: Multi-account support - currently defaulting to account 0"
- `utils.ts:48` - "HACK: yield.xyz SVG logos often fail to load in browser"

### 13. UI Bug: Network selector doesn't highlight selected item in dropdown
When a network is selected (e.g., "Arbitrum"), the button shows the selection correctly, but when reopening the dropdown, the selected item is not visually highlighted/selected. Should show active state (background color, checkmark, etc.) for the currently selected network.

Location: `src/pages/Yields/components/YieldFilters.tsx` - NetworkFilter component

### 14. UI Bug: Provider selector doesn't highlight selected item in dropdown
Same issue as #13 - when a provider is selected (e.g., "Lido"), the button shows it correctly but the dropdown doesn't highlight the selected item when reopened. Consider if highlighting is the best UX or if a checkmark/other indicator would be better.

Location: `src/pages/Yields/components/YieldFilters.tsx` - ProviderFilter component

### 15. UI Bug: Provider dropdown overflows page height
The "All Providers" dropdown list is too long and extends beyond the viewport. Should add max-height with overflow-y scroll, similar to fix in https://github.com/shapeshift/web/pull/11546

Location: `src/pages/Yields/components/YieldFilters.tsx` - ProviderFilter MenuList

### 16. Feature: Multi-select filters with URL persistence
Current filters (Network, Provider) are single-select pickers. Should be multi-select filters that:
- Allow selecting multiple networks/providers at once
- Persist all filter state in URL query params (e.g., `?networks=ethereum,arbitrum&providers=aave,lido&sort=apy-desc`)
- Allow cumulating filters
- Same for sort options

Check if TanStack Table supports this natively. This would enable shareable filtered views.

Location: `src/pages/Yields/components/YieldFilters.tsx`
