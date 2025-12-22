# Test Scenario Template: New Chain Integration

**Test Type:** End-to-End Chain Integration Verification
**Purpose:** Comprehensive validation of a new blockchain integration in ShapeShift Web
**Template Version:** 1.0
**Date Created:** 2025-12-18

---

## Overview

This template provides a complete testing workflow for validating new chain integrations. It covers account management, chain visibility, asset discovery, and market data display. Follow this template for any new blockchain added to ShapeShift.

---

## Prerequisites

### Environment
- **Application:** ShapeShift Web running locally (`http://localhost:3000`)
- **Wallet:** Native ShapeShift wallet with password access
- **Test Data:** Existing holdings on the target chain (for account derivation testing)

### Required Information
Before starting, gather:
- **Chain Name:** (e.g., Solana, Sui, Cosmos)
- **Chain ID:** CAIP-2 format (e.g., `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`)
- **Native Asset:** Symbol and name (e.g., SOL - Solana)
- **Test Assets:** 2-3 assets with existing market data
  - At least 1 multi-chain asset (e.g., USDC)
  - At least 1 chain-native asset
  - At least 1 chain-specific token with market data

---

## Test Procedure

### Phase 1: Account Derivation & Management

#### 1.1 Access Manage Accounts Modal
**Steps:**
1. Navigate to `http://localhost:3000` (or your test environment)
2. Ensure wallet is connected and unlocked
3. Click wallet button (top right corner)
4. Click three-dot menu icon
5. Click "Manage Accounts"

**Expected Result:**
- ✅ Manage Accounts modal opens
- ✅ List of all supported chains displayed
- ✅ Target chain appears in the list with account count

**Pass Criteria:** Chain is visible in Manage Accounts modal

---

#### 1.2 Derive Multiple Accounts
**Steps:**
1. Click on the target chain row in Manage Accounts
2. Note initial account count (usually "1")
3. Click "Load More" button to derive additional accounts
4. Repeat until 3-4 accounts are derived
5. Observe account addresses and balances

**Expected Result:**
- ✅ Additional accounts appear with each "Load More" click
- ✅ Accounts show correct format addresses
- ✅ Accounts display accurate balances (if any)
- ✅ Account numbering follows format: "Account #0", "Account #1", etc.

**Pass Criteria:**
- Successfully derive at least 3 accounts
- Accounts display unique addresses in correct format

**Example (Solana):**
```
Account 0: 6HYauF...U4du1b (0.09334738 SOL)
Account 1: HP8FP6...XiKtMo (0 SOL)
Account 2: 9RtaPi...dyNVXd (0 SOL)
Account 3: BzirFo...ofXTne (0 SOL)
```

---

#### 1.3 Activate Multiple Accounts
**Steps:**
1. In the Import Accounts screen, check checkboxes for at least 2-3 accounts
2. Ensure Account #0 remains checked (usually active by default)
3. Click "Import" or "Confirm" button
4. Wait for accounts to be activated
5. Return to Manage Accounts modal

**Expected Result:**
- ✅ Selected accounts become active
- ✅ Chain account count updates (e.g., "1" → "3")
- ✅ No errors during activation
- ✅ Active accounts persist after modal close

**Pass Criteria:**
- At least 2 accounts successfully activated
- Account count reflects number of active accounts

---

### Phase 2: Chain Visibility Verification

#### 2.1 Global Search Verification
**Steps:**
1. Close Manage Accounts modal
2. Press ⌘+K (Mac) or Ctrl+K (Windows/Linux) to open global search
3. Type the chain name in search box
4. Observe search results

**Expected Result:**
- ✅ Native chain asset appears in results (e.g., "Solana" for SOL)
- ✅ Chain-based tokens appear in results
- ✅ Search results show correct balances
- ✅ Asset icons display correctly

**Pass Criteria:** Chain assets are discoverable via global search

**Example Search Results (Solana):**
- Solana (SOL) - 0.093 SOL ($11.34)
- Jupiter (JUP) - 59.75 JUP ($10.44)
- Various Solana-based tokens

---

#### 2.2 Swapper Asset Selection Verification
**Steps:**
1. Navigate to Trade page (`/#/trade`)
2. Click on destination asset selector (bottom "You Get" section)
3. Observe "My Assets" list
4. Type chain name in search box
5. Observe filtered results

**Expected Result:**
- ✅ Chain assets appear in "My Assets" section
- ✅ Assets display correct balances
- ✅ Chain selector shows chain name correctly
- ✅ Search filtering works for chain assets
- ✅ Multiple asset instances on different chains are distinguishable

**Pass Criteria:**
- Chain assets selectable in swapper
- Search accurately filters chain-specific assets

---

#### 2.3 Asset Filtering & Discovery
**Steps:**
1. In asset selector, search for common cross-chain assets (e.g., "USDC")
2. Verify chain-specific version appears
3. Search for chain-native tokens
4. Click "All" filter to see chain selector
5. Verify chain appears as filter option (if implemented)

**Expected Result:**
- ✅ Cross-chain assets show chain distinction (e.g., "USDC on Solana")
- ✅ Chain-native assets are discoverable
- ✅ Chain badge/icon displays correctly
- ✅ Related Assets section shows chain-specific versions

**Pass Criteria:**
- All asset types discoverable and distinguishable
- Chain attribution clear and accurate

---

### Phase 3: Asset Page & Market Data Verification

#### 3.1 Native Asset Page (e.g., SOL, SUI, ATOM)
**Steps:**
1. Navigate to native asset via search or direct URL:
   `/#/assets/{chainId}/{assetId}`
2. Wait for page to fully load
3. Verify all page sections

**Expected Result:**

**✅ Price & Chart Section:**
- Current price displayed in USD
- Price change (amount and percentage)
- Interactive chart with time period controls (1H, 24H, 1W, 1M, 1Y, All)
- Chart renders without errors
- Price range indicators visible

**✅ Balance Section:**
- "Your balance" heading present
- Total balance in USD
- Total balance in native units
- Breakdown by derived accounts
- Account percentages correct
- Account labels (e.g., "Account #0 • Wallet")

**✅ Market Data Section:**
- Price (matches header price)
- Market Cap
- 24hr Volume
- Day Change (with direction indicator)
- Max Total Supply
- Available/Circulating Supply

**✅ Action Buttons:**
- Trade button functional
- Buy/Sell button present
- Send button functional
- Receive button functional
- "More" menu available

**Pass Criteria:**
- All sections render correctly
- Market data is current and accurate
- No console errors
- Interactive elements responsive

**Example (Solana - SOL):**
```
Price: $121.25
Market Cap: $68.18B
24hr Volume: $5.64B
Day Change: -0.54%
Supply: 562.17M / 616.45M
Balance: 0.09334738 SOL ($11.32)
Accounts: 3 accounts, 100% in Account #0
```

---

#### 3.2 Cross-Chain Asset Page (e.g., USDC on Solana)
**Steps:**
1. Navigate to cross-chain asset page
2. Verify asset identification shows chain
3. Check market data
4. Verify "Related Assets" section

**Expected Result:**

**✅ Asset Identification:**
- Title shows chain context (e.g., "USDC on Solana (USDC)")
- Dual icons for asset + chain
- Correct chain badge

**✅ Market Data:**
- Same requirements as native asset
- Price reflects chain-specific market (if applicable)
- Supply data accurate

**✅ Related Assets:**
- Shows same asset on other chains
- Table displays asset variants
- Clickable rows navigate correctly
- Pagination works (if needed)

**Pass Criteria:**
- Chain attribution clear
- Related assets accurate and complete
- All cross-chain versions distinguishable

**Example (USDC on Solana):**
```
Price: $0.999
Market Cap: $77.42B
24hr Volume: $13.33B
Supply: 77.44B available
Balance: 9.807377 USDC ($9.81)

Related Assets:
- USDC (Ethereum)
- USDC on Arbitrum One
- USDC on Polygon
- USDC on Avalanche
... (10+ chains)
```

---

#### 3.3 Chain-Native Token Page (e.g., Jupiter on Solana)
**Steps:**
1. Search for chain-native token via global search
2. Navigate to asset page
3. Verify market data and metadata
4. Check token-specific features

**Expected Result:**

**✅ Token Metadata:**
- Correct token name and symbol
- Chain attribution clear
- Token icon displays
- Description (if available)

**✅ Market Data:**
- All standard fields present
- Token supply metrics accurate
- Market cap reflects circulating supply
- Volume data current

**✅ Token Features:**
- Correct contract address (if applicable)
- Token standard noted (if applicable)
- Project links (if configured)

**Pass Criteria:**
- Token data accurate
- No confusion with tokens on other chains
- Market data current

**Example (Jupiter - JUP):**
```
Price: $0.174
Market Cap: $547.97M
24hr Volume: $22.97M
Day Change: -4.55%
Supply: 3.13B / 10B
Balance: 59.75926 JUP ($10.42)
Chain: Solana
```

---

## Test Results Summary Template

| Test Area | Sub-Test | Status | Notes |
|-----------|----------|--------|-------|
| **Phase 1: Account Management** | | | |
| 1.1 | Access Manage Accounts | ⬜ PASS / ❌ FAIL | |
| 1.2 | Derive Multiple Accounts | ⬜ PASS / ❌ FAIL | Accounts derived: X |
| 1.3 | Activate Accounts | ⬜ PASS / ❌ FAIL | Accounts activated: X |
| **Phase 2: Chain Visibility** | | | |
| 2.1 | Global Search | ⬜ PASS / ❌ FAIL | |
| 2.2 | Swapper Asset Selection | ⬜ PASS / ❌ FAIL | |
| 2.3 | Asset Filtering | ⬜ PASS / ❌ FAIL | |
| **Phase 3: Asset Pages** | | | |
| 3.1 | Native Asset Page | ⬜ PASS / ❌ FAIL | Asset: ___ |
| 3.2 | Cross-Chain Asset Page | ⬜ PASS / ❌ FAIL | Asset: ___ |
| 3.3 | Chain-Native Token Page | ⬜ PASS / ❌ FAIL | Asset: ___ |

---

## Common Issues & Troubleshooting

### Account Derivation Issues
- **Problem:** "Load More" button doesn't appear
- **Solution:** Check if chain supports HD derivation, verify account discovery service is running

- **Problem:** Accounts show incorrect addresses
- **Solution:** Verify derivation path configuration for chain, check HDWallet integration

### Search Issues
- **Problem:** Chain assets don't appear in search
- **Solution:**
  - Verify asset generation completed
  - Check asset service integration
  - Confirm chain is in supported list
  - Look for console errors

### Market Data Issues
- **Problem:** Price/chart not displaying
- **Solution:**
  - Check CoinGecko API integration
  - Verify asset ID mappings
  - Check for rate limiting
  - Confirm asset has market data available

- **Problem:** Incorrect market cap/volume
- **Solution:** Verify CoinGecko asset ID mapping is correct

### Asset Page Issues
- **Problem:** Asset page returns 404 or blank
- **Solution:**
  - Check CAIP asset ID format
  - Verify asset is in asset service
  - Check route configuration
  - Confirm asset generation for chain

---

## Automation Recommendations

### Test Data Setup
```typescript
// Example test data structure
const chainTestConfig = {
  chainName: 'Solana',
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  nativeAsset: {
    symbol: 'SOL',
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    expectedBalance: '0.09334738'
  },
  crossChainAsset: {
    symbol: 'USDC',
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5...',
    expectedBalance: '9.807377'
  },
  nativeToken: {
    symbol: 'JUP',
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwr...',
    expectedBalance: '59.75926'
  },
  accountDerivation: {
    minAccounts: 3,
    expectedAddressFormat: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  }
}
```

### Automated Test Scenarios
1. **Account Derivation Flow**
   - Navigate → Manage Accounts → Derive → Activate
   - Assert account count updates
   - Verify persistence

2. **Search Flow**
   - Open search → Type chain name → Assert results
   - Verify all expected assets appear

3. **Asset Page Flow**
   - Navigate to each asset type
   - Assert all sections render
   - Verify market data present
   - Check interactive elements

---

## Success Criteria

**Chain integration passes when ALL of the following are true:**

✅ **Account Management (Critical)**
- [ ] Can access Manage Accounts modal
- [ ] Can derive at least 3 accounts
- [ ] Can activate at least 2 accounts
- [ ] Account count updates correctly
- [ ] Accounts persist after page refresh

✅ **Chain Visibility (Critical)**
- [ ] Chain assets appear in global search
- [ ] Chain assets selectable in swapper
- [ ] Asset filtering works correctly
- [ ] Chain attribution clear and accurate

✅ **Asset Pages (Critical)**
- [ ] Native asset page loads with all sections
- [ ] Cross-chain asset page distinguishes chain
- [ ] Chain-native token page displays correctly
- [ ] Market data present and accurate for all 3+ assets
- [ ] Price charts render without errors
- [ ] Account balances accurate

✅ **User Experience (Important)**
- [ ] No console errors during testing
- [ ] All interactions responsive
- [ ] Icons and images load correctly
- [ ] Navigation flows smoothly
- [ ] No performance degradation

✅ **Data Accuracy (Important)**
- [ ] Balances match blockchain state
- [ ] Market prices current (within 5 minutes)
- [ ] Supply data accurate
- [ ] Address formats correct

---

## Chain-Specific Customization

When adapting this template for a specific chain:

1. **Update Prerequisites:**
   - Replace "Solana" with target chain name
   - Update chain ID format
   - List chain-specific assets for testing

2. **Modify Account Derivation:**
   - Adjust expected account count if chain has different derivation
   - Update address format regex
   - Note any chain-specific derivation behavior

3. **Asset Selection:**
   - Choose 3+ assets with:
     - Active market data on CoinGecko
     - Different characteristics (native, wrapped, token)
     - Sufficient diversity for testing

4. **Known Limitations:**
   - Document any chain-specific limitations
   - Note unsupported features
   - List planned future enhancements

---

## Appendix: Example Test Report

See `relay-usdc-arbitrum-to-solana.md` for a complete example of a test scenario execution with:
- Full step-by-step documentation
- Screenshots and evidence
- Issue tracking
- Performance metrics
- Recommendations

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-18 | Initial template based on Solana integration testing | Claude Code |

---

## Related Documentation

- [ShapeShift Chain Integration Guide](https://github.com/shapeshift/web/docs/chains/)
- [HDWallet Integration](https://github.com/shapeshift/hdwallet)
- [Asset Service](https://github.com/shapeshift/web/docs/asset-service/)
- [Testing Guidelines](https://github.com/shapeshift/web/docs/testing/)
