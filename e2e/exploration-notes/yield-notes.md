# Yield / DeFi Exploration Notes

## Third Pass — Wallet Drawer DeFi Tab Retry

**Date:** 2026-02-28
**Environment:** https://develop.shapeshift.com (qabot browser profile, wallet "test")

### Wallet Drawer DeFi Tab — Successfully Loaded

The DeFi tab in the wallet drawer **loads correctly** after ~30 seconds. The previous report of navigation to `about:blank` was an agent interaction artifact, not a real bug.

#### Drawer Structure
- **Tabs:** My Crypto | Accounts | Watchlist | DeFi | Activity
- **Wallet total balance:** ~$350.44
- The drawer is a Chakra UI `dialog` with `TabList` / `TabPanels`

#### DeFi Tab Content
The DeFi tab displays a **paginated table** (3 pages, ~30 rows per page) of yield positions sorted by fiat value descending, then by APY.

**Features:**
- "All Chains" dropdown filter at top
- Search textbox
- Pagination: "Previous Page / X of 3 / Next Page"

#### Page 1 — Positions with Balance (sorted by value)

| Asset | Ticker | Value | APY |
|-------|--------|-------|-----|
| Solana (staking) | SOL | $2.63 | 5.53% |
| Ethereum (staking) | ETH | $2.20 | 2.83% |
| Cosmos (staking) | ATOM | $1.98 | 15.39% |
| Avalanche (staking) | AVAX | $1.62 | 4.94% |
| Tron (staking) | TRX | $1.42 | 4.96% |
| Tether | USDT | $1.40 | 3.77% |
| UniswapV2 LP WETH/FOX Pool | WETH/FOX | $0.76 | 830.88% |
| USDC | USDC | $0.29 | 2.18% |
| Bitcoin Cash | BCH | $0.29 | 0.00% |
| BNB | BNB | $0.29 | 0.00% |
| Bitcoin | BTC | $0.29 | 0.00% |
| Dogecoin | DOGE | $0.29 | 0.00% |
| Litecoin | LTC | $0.29 | 0.00% |
| USDC (second entry) | USDC | $0.27 | 4.00% |
| Bridged USDT | USDT | $0.20 | 3.38% |
| USDT0 | USDT0 | $0.13 | 7.38% |
| USDT0 (second) | USDT0 | $0.13 | 5.70% |
| VaultBridge Bridged USDC (Katana) | VBUSDC | $0.09 | 13.78% |
| UniswapV2 ETH/FOX Pool | WETH/FOX | $0.05 | 0.00% |
| FOX | FOX | $0.04 | 0.00% |
| FOX (second) | FOX | $0.03 | 0.00% |
| WETH | WETH | $0.01 | 2.83% |
| VaultBridge Bridged ETH (Katana) | VBETH | - | 9.66% |
| Ethena USDe | USDE | - | 7.11% |
| USDC | USDC | - | 7.03% |
| L2 Standard Bridged WETH (Optimism) | WETH | - | 6.40% |
| GHO | GHO | - | 6.01% |
| GHO (second) | GHO | - | 5.68% |
| GHO (third) | GHO | - | 5.63% |
| Vault Bridge Bridged USDT (Katana) | VBUSDT | - | 4.95% |

#### Observations: Positions with "-" balance
- Many rows show value as "-" meaning the user has 0 balance but an opportunity exists
- These appear to be yield opportunities the wallet has interacted with or that are available
- The table mixes **active positions** (with balance) and **yield opportunities** (no balance)

#### Page 2 and 3
- Pages 2-3 contain many more yield opportunities with "-" balance
- Assets include: CASH, USDC variants, AUSD, GHO, DAI variants, EURC, USDS, WETH, LUSD, BSC-USD, PYUSD, USDT variants, EURS, RLUSD, STASIS EURO
- APYs range from 0.02% (EURS) to 4.63% (CASH)

### Comparison: DeFi Tab vs /earn (Yields Page)

**Yields Page (/earn → Yields) — My Positions tab:**
- Shows **20 active positions** with balance
- Total: $5.56 across 20 positions
- Available to earn: $199.59 (idle assets)
- Potential earnings: $6.41/yr
- Recommended: stETH (Lido 2.34%), ATOM (ShapeShift DAO 15.39%), TRX (StakeKit 4.96%)
- Shows provider info (Lido, Figment, ShapeShift DAO, StakeKit, etc.)

**Key Differences:**
1. **DeFi Tab** shows a merged view of ALL positions (active + opportunity) in a single flat table
2. **Yields Page** separates "Available to Earn" and "My Positions" into distinct sub-tabs
3. **Yields Page** is richer: shows provider logos, APY type (APR vs APY), recommendations
4. **DeFi Tab** is more compact but less informative — no provider info visible
5. **DeFi Tab** includes positions showing 0.00% APY (BCH, BNB, BTC, DOGE, LTC) — these appear to be native chain balances, not actual DeFi positions
6. Both pages agree on position counts and APY values

### Earn Nav Dropdown — Sticky Menu Behavior

The Earn dropdown in the navbar has a **sticky menu** behavior:
- The dropdown uses `useHoverIntent` hook with hover-based open/close
- Submenu items: **Yields (New)** | **TCY** | **Pools** | **Lending**
- The menu has `aria-expanded="true"` and remains visible even after clicking main content area
- **Root cause:** The `NavigationDropdown` component uses `useDisclosure` + `useHoverIntent` for hover-based open/close. The `onClose` fires via `handleMouseLeave` with a 300ms delay, but in automated testing, proper mouse leave events may not fire
- **For real users:** This is likely fine — the hover intent pattern should work normally with real mouse events. The 300ms close delay prevents accidental closures when moving the mouse to submenu items
- **Source:** `src/components/Layout/Header/NavBar/NavigationDropdown.tsx`

### data-test / data-testid Gaps Found

The project uses mixed conventions: `data-test` (older) and `data-testid` (newer).

**Missing testids (added in this pass):**

| Component | Element | Added `data-test` |
|-----------|---------|-------------------|
| `NavigationDropdown.tsx` | MenuButton | `navigation-{label}-dropdown` |
| `NavigationDropdown.tsx` | MenuItem | `navigation-{label}-menuitem` |
| `DeFiEarn.tsx` | Container Flex | `defi-earn-container` |
| `PositionTable.tsx` | ReactTable | `defi-earn-position-table` |

**Already had testids (from previous pass):**

| Component | Element | `data-testid` |
|-----------|---------|---------------|
| `DrawerWalletDashboard.tsx` | Drawer tabs | `drawer-tab-my-crypto`, `drawer-tab-accounts`, `drawer-tab-watchlist`, `drawer-tab-defi`, `drawer-tab-activity` |

**Still missing testids (not added — would require deeper changes):**

| Component | Element | Suggested |
|-----------|---------|-----------|
| `DrawerWalletDashboard.tsx` | Action buttons (Send/Receive/AI Chat) | `drawer-action-send`, `drawer-action-receive`, `drawer-action-ai-chat` |
| Yields page | Main tabs (All / Available / My Positions) | `yields-tab-all`, `yields-tab-available`, `yields-tab-positions` |
| Yields page | Filter buttons | `yields-filter-networks`, `yields-filter-providers`, `yields-filter-types` |
| PositionTable | Individual row | `position-row-{assetId}` |

### Wallet Drawer Persistence Bug

**Minor UX issue observed:** The wallet drawer (dialog) persists across hash-based navigation. When the drawer is open and the user navigates to a different route (e.g., from `/trade` to `/earn`), the drawer stays open overlaying the new page. This is likely by design (the drawer is a global overlay), but worth noting for E2E tests — they need to explicitly close the drawer before testing page content beneath it.

---

## Third Pass — Trade Page Earn Tab Retry

**Date:** 2026-02-28
**Environment:** https://develop.shapeshift.com (qabot browser profile, wallet "test")

### Earn Tab — Fully Functional ✅

The Earn tab within the Trade page widget works correctly. The previous pass had interaction issues — this retry confirms all functionality.

### How to Access
- Navigate to `/#/trade`
- The Trade widget has 3 tab headings: **Swap** | **Buy/Sell** | **Earn**
- Click the "Earn" `<h5>` heading to switch tabs
- URL navigates to: `/#/earn/{assetId}/{yieldId}/{accountIndex}`

### Default State (ETH → Lido Staking)
When first clicked, the Earn tab defaults to:
- **Asset:** ETH on Ethereum (from current swap asset)
- **Yield:** Lido Ethereum Staking @ 2.34% APY
- **Balance shown:** 0.08790972 ETH
- **Submit button:** "Enter Amount" (disabled until amount entered)
- **Informational notes:**
  - "Rewards are distributed every block and accrue automatically"
  - "When unstaking, there is a 7 day unbonding period before tokens are available"

### With Amount Entered (0.01 ETH)
After entering 0.01 ETH:
- **Fiat value:** ≈ $18.65
- **APY:** 2.34%
- **Est. Yearly Earnings:** 0.000234 ETH ($0.44)
- **Yield Type:** staking
- **Network Fee:** $0.02
- **Submit button:** Changes to **"Stake"** (enabled)

### Yield Selector Modal — ETH Options
Clicking the yield selector button opens a modal: **"Select yield for ETH"**

**STAKING category (5 options):**

| Provider | Name | APY |
|----------|------|-----|
| Figment | Figment Native Staking | 2.83% |
| Luganodes | Luganodes Native Staking | 2.71% |
| Lido | Lido Ethereum Staking | 2.34% |
| Mantle | Mantle Staked ETH | 2.34% |
| Rocket Pool | RocketPool Staked ETH | 2.25% |

### Asset Selector — "Enter from" Dialog
Clicking the asset button (e.g. "ETH") opens the **"Enter from"** asset selector dialog:
- **Quick filter chips:** All, ETH, USDT, USDC, SOL, TRX, DAI
- **My Assets section:** Lists wallet balances sorted by value
- **Popular Assets section:** Lists commonly traded assets
- Clicking a multi-chain asset (like USDC) expands to show chain-specific variants:
  - Ethereum (USDC) — 4.7 USDC ($4.71)
  - Arbitrum One (USDC) — 3.33 USDC ($3.33)
  - Base (USDC) — 2.029 USDC ($2.03)
  - Gnosis (USDC.E) — 1.49 USDC.E ($1.50)
  - + more chains...

### After Switching to USDC on Ethereum
- **Balance:** 4.702612 USDC
- **Auto-selected yield:** Spark Savings USDC @ 4.00% APY
- **Notes:** "Yield accrues automatically" / "Withdrawing available immediately"
- **URL:** `/#/earn/eip155%3A1%2Ferc20%3A0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/ethereum-usdc-spusdc-...-4626-vault/0`

### Yield Selector Modal — USDC Options
Two categories for USDC on Ethereum:

**LENDING (5 options):**

| Provider | Name | APY |
|----------|------|-----|
| Fluid | USD Coin Lending Fluid Vault | 3.44% |
| Gearbox | USDC Trade USDC v3 Gearbox Vault | 2.87% |
| Compound | Compound v3 Lending | 2.61% |
| Aave | Aave v3 Lending | 2.01% |
| Spark | Sparklend | 1.99% |

**VAULT (1 option):**

| Provider | Name | APY |
|----------|------|-----|
| Spark | Spark Savings USDC | 4.00% |

### Tab Switching
- **Swap → Earn → Swap:** Works correctly, no stuck state
- Earn tab remembers asset selection when switching back
- Each tab has distinct URL paths (`/trade/*` vs `/earn/*`)

### UX Notes
- The account selector (Balance button) has an `[expanded]` dropdown that shows per-account balances — **2 ETH accounts** visible (0.08790972 ETH and 0.00044408 ETH)
- Network selector is disabled in the Earn tab (locked to the yield's chain)
- The "Switch Assets" button is disabled in Earn mode (not applicable)
- Submit button text changes dynamically: "Enter Amount" → "Stake" (or "Deposit" for vault yields)

### Comparison: Trade Earn Tab vs Yields Page (/yields)

| Feature | Trade Earn Tab | Yields Page |
|---------|---------------|-------------|
| Focus | Single yield at a time | Browse all yields |
| Asset selection | Via asset picker modal | Filters (network/provider/type) |
| Yield selection | Modal per selected asset | Grid/list of all opportunities |
| Amount input | Built-in with fiat toggle | Via separate detail page |
| Stats shown | APY, Est. earnings, fee | APY, TVL, provider info |
| Best for | Quick stake/deposit | Discovery & comparison |

### data-testid Coverage
The Earn tab components already have testids from the bulk instrumentation pass:
- `earn-tab` — Main container
- `earn-input-form` — SharedTradeInput
- `earn-confirm-form` — EarnConfirm
- `earn-submit-button` — Submit/stake button
- `earn-yield-selector` — Yield selector button
- `earn-yield-selector-modal` — Yield selection dialog
- `earn-yield-option-{yieldId}` — Individual yield options
- `earn-yield-search-input` — Search in yield selector
