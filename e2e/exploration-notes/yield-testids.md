# Yield/Earn data-testid Reference

All data-testid attributes added to yield/earn components for E2E testing.

## Main Yields/Earn Page (`src/pages/Yields/components/YieldsList.tsx`)
- `yields-page` — Main container
- `yields-page-title` — Page heading
- `yields-tab-all` — "All" tab
- `yields-tab-available` — "Available to Earn" tab
- `yields-tab-my-positions` — "My Positions" tab
- `yields-search-input` — Search input
- `yields-filters` — Filters wrapper (passed as prop)

## Filters (`src/pages/Yields/components/YieldFilters.tsx`)
- `yield-filter-{label}` — Dynamic filter buttons (networks, providers, types)
- `yield-filter-sort` — Sort button

## View Toggle (`src/pages/Yields/components/YieldViewHelpers.tsx`)
- `yields-view-toggle` — Toggle button group
- `yields-view-grid` — Grid view button
- `yields-view-list` — List view button

## Stats Bar (`src/pages/Yields/components/YieldOpportunityStats.tsx`)
- `yields-stats-bar` — Stats grid container
- `yields-stat-active-positions` — Active positions stat card
- `yields-stat-available-to-earn` — Available to earn stat card
- `yields-stat-potential-earnings-label` — Potential earnings label

## Yield Items (`src/pages/Yields/components/YieldItem.tsx`)
- `yield-item-{yieldId|assetSymbol}` — Each yield card/row/mobile (dynamic)

## Yield Detail Page (`src/pages/Yields/YieldDetail.tsx`)
- `yield-detail-page` — Detail page container
- `yield-detail-back-button` — Back navigation button

## Yield Hero (`src/pages/Yields/components/YieldHero.tsx`)
- `yield-hero` — Hero section container
- `yield-hero-apy-badge` — APY badge
- `yield-hero-enter-button` — Deposit/Stake button
- `yield-hero-exit-button` — Withdraw/Unstake button

## Yield Position Card (`src/pages/Yields/components/YieldPositionCard.tsx`)
- `yield-position-card` — Position card
- `yield-position-connect-wallet` — Connect wallet button (when no wallet)
- `yield-position-enter-button` — Enter/Deposit button
- `yield-position-exit-button` — Exit/Withdraw button
- `yield-position-withdraw-button` — Withdraw pending action button
- `yield-position-claim-button` — Claim rewards button

## Available to Deposit (`src/pages/Yields/components/YieldAvailableToDeposit.tsx`)
- `yield-available-to-deposit` — Card container
- `yield-get-asset-button` — "Get Asset" button (when no balance)

## Yield Stats (`src/pages/Yields/components/YieldStats.tsx`)
- `yield-stats` — Stats card
- `yield-stat-tvl` — TVL stat
- `yield-stat-reward-schedule` — Reward schedule stat
- `yield-stat-type` — Yield type stat

## Yield Info Card (`src/pages/Yields/components/YieldInfoCard.tsx`)
- `yield-info-card` — Info card (desktop)
- `yield-info-apy` — APY display

## Provider Info (`src/pages/Yields/components/YieldProviderInfo.tsx`)
- `yield-provider-info-{providerId}` — Provider info section (dynamic)

## Related Markets (`src/pages/Yields/components/YieldRelatedMarkets.tsx`)
- `yield-related-markets` — Related markets section

## Yield Manager Modal (`src/pages/Yields/components/YieldManager.tsx`)
- `yield-manager-modal` — Manager dialog

## Yield Form (`src/pages/Yields/components/YieldForm.tsx`)
- `yield-form-percent-buttons` — Percent preset button group
- `yield-form-percent-25` / `yield-form-percent-50` / `yield-form-percent-75` / `yield-form-percent-max` — Individual percent buttons
- `yield-form-currency-toggle` — Fiat/crypto toggle
- `yield-form-submit-button` — Submit/confirm button

## Yield Enter Modal (`src/pages/Yields/components/YieldEnterModal.tsx`)
- `yield-enter-modal` — Enter modal dialog
- `yield-enter-percent-buttons` — Percent preset button group
- `yield-enter-percent-25` / `yield-enter-percent-50` / `yield-enter-percent-75` / `yield-enter-percent-max` — Individual percent buttons
- `yield-enter-currency-toggle` — Fiat/crypto toggle
- `yield-enter-submit-button` — Submit button

## Yield Action Modal (`src/pages/Yields/components/YieldActionModal.tsx`)
- `yield-action-modal-{action}` — Action modal (dynamic: enter/exit/manage)
- `yield-action-confirm-button` — Confirm button
- `yield-action-close-button` — Close button (on success)

## Success Screen (`src/pages/Yields/components/YieldSuccess.tsx`)
- `yield-success` — Success container
- `yield-success-view-position` — View position button
- `yield-success-close` — Close button

## Active Positions (`src/pages/Yields/components/YieldActivePositions.tsx`)
- `yield-active-position-{yieldId}` — Position row (dynamic, both desktop table row and mobile card)

## Opportunity Card (`src/pages/Yields/components/YieldOpportunityCard.tsx`)
- `yield-opportunity-card` — Opportunity card
- `yield-start-earning-button` — Start earning CTA button

## Asset Section (`src/pages/Yields/components/YieldAssetSection.tsx`)
- `yield-asset-section` — Yield section on asset page

## Trade Page Earn Tab
### Header (`src/components/MultiHopTrade/components/SharedTradeInput/SharedTradeInputHeader.tsx`)
- `trade-tab-earn` — Earn tab (desktop)
- `trade-tab-earn-mobile` — Earn tab (mobile)

### Yield Selector (`src/components/MultiHopTrade/components/Earn/components/YieldSelector.tsx`)
- `earn-yield-selector` — Yield selector button
- `earn-yield-selector-modal` — Yield selector modal
- `earn-yield-search-input` — Search input in yield selector
- `earn-yield-option-{yieldId}` — Individual yield option (dynamic)

### Footer (`src/components/MultiHopTrade/components/Earn/components/EarnFooter.tsx`)
- `earn-submit-button` — Submit/stake button

## Wallet Drawer (`src/components/Layout/Header/NavBar/DrawerWalletDashboard.tsx`)
- `drawer-tab-my-crypto` — My Crypto tab
- `drawer-tab-accounts` — Accounts tab
- `drawer-tab-watchlist` — Watchlist tab
- `drawer-tab-defi` — DeFi tab
- `drawer-tab-activity` — Activity tab
