# Yield.xyz Integration Polish - Execution Plan

> **Context**: Bugfixes and polishes identified during testing of PR #11578. Feedback from @NeOMakinG.  
> **Related Issue**: [#11611](https://github.com/shapeshift/web/issues/11611)  
> **Related PR**: [#11578](https://github.com/shapeshift/web/pull/11578)

---

## Execution Instructions

Each section below is a **standalone TODO** that can be executed independently. Before proceeding with each item:

1. **ASK** the user: "Should I proceed with TODO X: [Title]?"
2. **WAIT** for explicit confirmation before implementing
3. **AFTER** completion, ask: "TODO X complete. Should I continue to TODO Y?"

---

## Bugs

### TODO 1: Fix Network Filtering - Hiding Other Networks

> [!IMPORTANT]
> **Issue**: Selecting a network hides other networks. Users should be able to click again to see all networks and instantly select another one.

**Current Behavior**: When a network is selected in the filter dropdown, clicking the dropdown again only shows the selected network (or a subset).

**Expected Behavior**: The dropdown should always display ALL available networks, with the currently selected one highlighted. Clicking "All Networks" should clear the filter.

**Investigation Areas**:
- [YieldFilters.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldFilters.tsx) - `FilterMenu` component logic
- [useYieldFilters.ts](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/hooks/useYieldFilters.ts) - Filter state management

**Proposed Fix**:
1. In `YieldFilters.tsx`, ensure the `networks` prop passed to `FilterMenu` is always the full list of networks (not filtered)
2. The filtering should only affect the yields list, not the filter options themselves
3. Verify `YieldsList.tsx` passes the complete `networks` array from `yields.meta.networks`

---

### TODO 2: Debug Tron Deposit Not Working

> [!CAUTION]
> **Issue**: Deposits on Tron chain don't work. Requires debugging.

**Investigation Areas**:
- [executeTransaction.ts](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/lib/yieldxyz/executeTransaction.ts#L432-495) - `executeTronTransaction` function
- [constants.ts](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/lib/yieldxyz/constants.ts#L38) - Tron chain ID mapping

**Debugging Steps**:
1. Verify `tronChainId` mapping to `YieldNetwork.Tron`
2. Check if `executeTronTransaction` handles all required fields
3. Verify Tron chain adapter is correctly initialized
4. Check for errors in transaction parsing/signing

**Proposed Fix**: TBD after debugging - needs reproduction and console log analysis.

---

### TODO 3: Fix Wrong Translation Chain on Approved Deposit Toast

> [!NOTE]
> **Issue**: The toast notification for approved deposits shows wrong chain translation.

**Investigation Areas**:
- [useYieldTransactionFlow.ts](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/hooks/useYieldTransactionFlow.ts#L235-282) - `dispatchNotification` function
- Translation keys in `main.json` for yield notifications

**Current Code Analysis**:
```typescript
// Line 275 in useYieldTransactionFlow.ts
message: formatYieldTxTitle(tx.title || 'Transaction', assetSymbol),
```

**Proposed Fix**:
1. Review the notification message construction in `dispatchNotification`
2. Ensure the correct chain name is passed to the translation
3. Check if `yieldChainId` is being properly resolved to chain name
4. Add chain name to the toast message if missing

---

### TODO 4: Fix Transparent Icon on Yield Page

> [!NOTE]
> **Issue**: Some icons appear transparent/invisible on yield pages.

**Investigation Areas**:
- [YieldDetail.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/YieldDetail.tsx#L100-127) - `heroIcon` element
- [YieldItem.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldItem.tsx#L130-177) - `iconElement` rendering
- CSS/styling for icon backgrounds

**Proposed Fix**:
1. Add background color to icon containers for better visibility
2. Check if icons with transparency need a white/dark background based on color mode
3. Review `AssetIcon` component for proper fallback handling

---

### TODO 5: Show Pending Deposits After Deposit (Solana)

> [!IMPORTANT]
> **Issue**: Balance isn't updated after a deposit. For Solana, deposits are pending by nature - should show pending deposit status.

**Investigation Areas**:
- [useAllYieldBalances.ts](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/react-queries/queries/yieldxyz/useAllYieldBalances.ts) - Balance fetching and normalization
- [YieldPositionCard.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldPositionCard.tsx) - Position display
- `YieldBalanceType` enum - includes `Entering` type for pending deposits

**Current Code Analysis**:
The balance types already include:
- `Active` - Active staked balance
- `Entering` - Pending/entering deposits
- `Exiting` - Pending withdrawals
- `Claimable` - Rewards ready to claim

**Proposed Fix**:
1. Ensure `Entering` balance type is properly displayed in UI
2. Add visual indicator for pending deposits in `YieldPositionCard`
3. Possibly add polling or refetch after deposit completion
4. Show "Pending" badge for `hasEntering` positions (already tracked in `ValidatorSummary`)

---

### TODO 6: Fix Network Filter + Asset Selection Opening Wrong Yield

> [!IMPORTANT]
> **Issue**: Selecting Ethereum as network, clicking on USDC, selecting the AAVE yield opens the BASE yield instead.

**Investigation Areas**:
- [YieldItem.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldItem.tsx#L118-128) - `handleClick` navigation
- [YieldAssetDetails.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/YieldAssetDetails.tsx) - Asset yields filtering
- [useYieldFilters.ts](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/hooks/useYieldFilters.ts) - Filter state via URL params

**Root Cause Hypothesis**:
When navigating from YieldsList → YieldAssetDetails → YieldDetail, the network filter state may not be properly passed through, or the filtered yields in YieldAssetDetails may not respect the network filter.

**Proposed Fix**:
1. Pass network filter through URL params when navigating to asset details
2. In `YieldAssetDetails`, respect the `network` search param when filtering yields
3. When clicking a specific yield, ensure the correct yield ID is used based on filtered context
4. Consider storing selected yield context in navigation state

---

## UX Improvements

### TODO 7: Improve "You Could Earn More" Messaging

> [!NOTE]
> **Issue**: "You could earn up to X% on your balance" messaging seems weird. Need to emphasize actual annual earnings.

**Investigation Areas**:
- [YieldOpportunityCard.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldOpportunityCard.tsx#L25) - `earnUpToText` usage
- Translation key: `yieldXYZ.earnUpTo` = "You could earn up to %{apy}% on your balance"

**Current Code**:
```typescript
const earnUpToText = useMemo(() => translate('yieldXYZ.earnUpTo', { apy }), [translate, apy])
```

**Proposed Changes**:
1. Change messaging to show estimated annual earnings in $ amount
2. Calculate: `userBalance * APY = estimatedYearlyEarnings`
3. New message format: "Earn ~$X per year" or "Your $X balance could earn ~$Y/year at X% APY"
4. Update translation key and component to accept balance amount

---

### TODO 8: Review Yield Opportunities in Account Page

> [!NOTE]
> **Issue**: Review design and layout of yield opportunities section in account page.

**Investigation Areas**:
- [AccountToken.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Accounts/AccountToken/AccountToken.tsx#L71) - Integration of `YieldAssetSection`
- [YieldAssetSection.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldAssetSection.tsx) - Section component
- [YieldOpportunityCard.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldOpportunityCard.tsx) - Card layout

**Current Layout**:
- Section appears after `EarnOpportunities` in account page
- Shows `YieldActivePositions` if positions exist
- Shows `YieldOpportunityCard` for best yield if no positions

**Design Review Points**:
1. Consistency with other account page sections
2. Card styling matches design system
3. Loading states are smooth
4. Empty states are handled gracefully

---

## Design/Polish

### TODO 9: Align Design with ShapeShift Design System

> [!WARNING]
> **Issue**: Current design feels "very AI" - needs to follow ShapeShift's established design patterns.

**Investigation Areas**:
- All yield component files in `src/pages/Yields/components/`
- Compare with established patterns in `src/components/`
- Color usage, spacing, typography

**Design Audit Checklist**:
1. [ ] Color palette matches design system (avoid arbitrary colors)
2. [ ] Consistent use of Chakra UI theme tokens
3. [ ] Typography follows established patterns
4. [ ] Spacing/padding consistent with other pages
5. [ ] Dark/light mode support complete
6. [ ] Loading states match app patterns
7. [ ] Error states match app patterns
8. [ ] Empty states match app patterns
9. [ ] Animations/transitions smooth and purposeful

**Files to Review**:
- [YieldsList.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldsList.tsx)
- [YieldItem.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldItem.tsx)
- [YieldDetail.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/YieldDetail.tsx)
- [YieldEnterExit.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldEnterExit.tsx)
- [YieldActionModal.tsx](file:///Users/alexandre.gomes/Sites/shapeshiftWebClone/src/pages/Yields/components/YieldActionModal.tsx)

---

### TODO 10: Improve Marketing Content/Messaging

> [!NOTE]
> **Issue**: Improve messaging and user-facing content throughout yield features.

**Investigation Areas**:
- Translation keys in `main.json` under `yieldXYZ` namespace
- Component text that may be hardcoded
- Call-to-action buttons
- Descriptions and help text

**Content Review Points**:
1. Clear value proposition for users
2. Simple, non-technical language where possible
3. Consistent terminology (yield vs staking vs earning)
4. Helpful tooltips for complex concepts
5. Error messages are actionable

---

## Summary Table

| # | Type | Issue | Priority | Complexity |
|---|------|-------|----------|------------|
| 1 | Bug | Network filtering hides networks | High | Low |
| 2 | Bug | Tron deposit not working | High | Medium |
| 3 | Bug | Wrong toast translation | Medium | Low |
| 4 | Bug | Transparent icon | Low | Low |
| 5 | Bug | Balance not updated (pending) | Medium | Medium |
| 6 | Bug | Wrong yield opens | High | Medium |
| 7 | UX | Earn messaging improvement | Low | Low |
| 8 | UX | Account page layout review | Low | Medium |
| 9 | Design | Design system alignment | Medium | High |
| 10 | Design | Marketing content | Low | Medium |

---

## Execution Order Recommendation

1. **High priority bugs first**: TODOs 1, 2, 6
2. **Medium priority bugs**: TODOs 3, 5
3. **Low priority bugs**: TODO 4
4. **UX improvements**: TODOs 7, 8
5. **Design/polish**: TODOs 9, 10

---

*Generated from issue analysis on 2026-01-11*
