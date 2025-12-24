# Test Scenario: Markets Discovery & Exploration

**Date:** 2025-12-18
**Test Type:** Feature Verification - Markets Discovery
**Feature:** Explore > Markets
**Status:** 📝 TEMPLATE

---

## Test Configuration

### Test Environment
- **Application URL:** `http://localhost:3000/#/markets/recommended`
- **Wallet Required:** No (browse mode)
- **Network:** Any

### Test Objectives
1. Verify all market categories display correctly
2. Validate asset data accuracy
3. Test filtering functionality
4. Verify navigation to asset pages
5. Validate chart rendering
6. Test responsive behavior

---

## Prerequisites

- [ ] ShapeShift Web running
- [ ] Stable internet connection (for market data)
- [ ] Browser with dev tools accessible

---

## Test Execution Steps

### Phase 1: Initial Page Load

#### 1.1 Navigate to Markets Page ⬜

**Steps:**
1. Open ShapeShift application
2. Click "Explore" in main navigation
3. Click "Markets" from dropdown
4. Wait for page to load

**Expected Result:**
- ✅ Markets page loads at `/#/markets/recommended`
- ✅ Page title: "Markets"
- ✅ Description text visible
- ✅ Tab navigation visible: "Recommended" and "My Watchlist"

**Pass Criteria:** Page loads within 5 seconds with all sections visible

---

#### 1.2 Verify Page Header ⬜

**Expected Elements:**
- ✅ Heading: "Markets"
- ✅ Description: "Discover the most exciting cryptocurrencies. Track top movers, emerging tokens, DeFi opportunities, and so much more. Save, share, and trade your favorites."
- ✅ Tab buttons: "Recommended" (active) and "My Watchlist"

**Pass Criteria:** All header elements present and formatted correctly

---

### Phase 2: Market Categories Verification

#### 2.1 Trending Category ⬜

**Location:** First category section

**Elements to Verify:**
- ✅ Category heading: "Trending"
- ✅ Link to full category page (arrow icon)
- ✅ Description: "The most viewed assets in the last 24 hours."
- ✅ Filter dropdown: "All Chains"
- ✅ Asset cards displayed (5 assets expected)

**Asset Card Components:**
- ✅ Asset icon
- ✅ Chain icon (if multi-chain)
- ✅ Asset name
- ✅ Asset symbol
- ✅ Current price
- ✅ 24h price change (percentage)
- ✅ Mini price chart (XYChart)
- ✅ Favorite toggle (star icon)
- ✅ Price range indicators (high/low)

**Example Assets to Verify:**
1. Bitcoin (BTC)
2. Toncoin (TON)
3. Monad (MON)
4. Ultima (ULTIMA)
5. Pudgy Penguins (PENGU)

**Pass Criteria:** All asset cards render with complete data

---

#### 2.2 Top Movers Category ⬜

**Location:** Second category section

**Elements to Verify:**
- ✅ Category heading: "Top Movers"
- ✅ Link to full category page
- ✅ Description: "Top assets that have jumped 10% or more."
- ✅ Filter dropdown: "All Chains"
- ✅ Asset cards or "No assets found" message

**Special Case:**
If no assets found:
- ✅ Empty state icon displayed
- ✅ Message: "No assets found"
- ✅ Subtext: "No assets were found with the current filter. See more assets by adjusting the selected chain."

**Pass Criteria:** Category renders correctly with either assets or empty state

---

#### 2.3 Trading Volume Category ⬜

**Location:** Third category section

**Elements to Verify:**
- ✅ Category heading: "Trading Volume"
- ✅ Link to full category page
- ✅ Description: "Top assets with the highest trading volume in the last 24 hours."
- ✅ Filter dropdown: "All Chains"
- ✅ Asset cards with volume data

**Pass Criteria:** Volume category displays with accurate data

---

#### 2.4 Market Cap Category ⬜

**Location:** Fourth category section

**Elements to Verify:**
- ✅ Category heading: "Market Cap"
- ✅ Link to full category page
- ✅ Description: "Top assets with the highest market capitalization in the last 24 hours."
- ✅ Filter dropdown: "All Chains"
- ✅ Asset cards with market cap data

**Pass Criteria:** Market cap category displays correctly

---

#### 2.5 Recently Added Category ⬜

**Location:** Fifth category section

**Elements to Verify:**
- ✅ Category heading: "Recently Added"
- ✅ Link to full category page
- ✅ Description: "Discover recent launches."
- ✅ Filter dropdown: "All Chains"
- ✅ Asset cards or empty state

**Pass Criteria:** Recently added category renders appropriately

---

#### 2.6 One Click DeFi Assets Category ⬜

**Location:** Sixth category section

**Elements to Verify:**
- ✅ Category heading: "One Click DeFi Assets"
- ✅ Link to full category page
- ✅ Description: "Discover the yield that suits you best! Shift effortlessly with Portals between Pools, Vaults, lending options, and LSDs."
- ✅ Filter dropdown: "All Chains"
- ✅ Asset cards or empty state
- ✅ Portals integration mention

**Pass Criteria:** DeFi category displays with Portals branding

---

### Phase 3: Filtering Functionality

#### 3.1 Chain Filter Test ⬜

**Steps:**
1. Click "All Chains" dropdown in Trending category
2. Observe available chain options
3. Select a specific chain (e.g., "Ethereum")
4. Wait for results to filter
5. Verify only assets on selected chain appear
6. Reset to "All Chains"

**Expected Chains (examples):**
- All Chains (default)
- Ethereum
- Bitcoin
- Solana
- Arbitrum
- Polygon
- (and more)

**Expected Result:**
- ✅ Dropdown opens on click
- ✅ Chain list displays
- ✅ Selection filters results
- ✅ Empty state shows if no assets match
- ✅ Reset to "All Chains" works

**Pass Criteria:** Chain filtering functions correctly across all categories

---

#### 3.2 Multiple Category Filter Test ⬜

**Steps:**
1. Select chain filter in Trending category
2. Note filtered results
3. Select same chain filter in Top Movers category
4. Verify consistent filtering
5. Test different chains in different categories

**Expected Result:**
- ✅ Each category can have independent filter
- ✅ Filters persist during session
- ✅ Results update immediately

**Pass Criteria:** Independent filtering works per category

---

### Phase 4: Asset Card Interactions

#### 4.1 Asset Card Click ⬜

**Steps:**
1. Click on any asset card (e.g., Bitcoin)
2. Verify navigation occurs
3. Note target URL pattern

**Expected Result:**
- ✅ Navigates to asset page
- ✅ URL format: `/#/assets/{chainId}/{assetId}`
- ✅ Asset page loads successfully

**Pass Criteria:** Asset card click navigation works

---

#### 4.2 Favorite Toggle ⬜

**Steps:**
1. Locate favorite icon (star) on asset card
2. Click to toggle favorite status
3. Observe visual feedback
4. Check if asset appears in "My Watchlist" tab

**Expected Result:**
- ✅ Star icon toggles filled/unfilled
- ✅ Visual feedback (color change)
- ✅ State persists across page refreshes
- ✅ Favorited assets appear in watchlist

**Pass Criteria:** Favorite functionality works correctly

---

#### 4.3 Price Chart Hover ⬜

**Steps:**
1. Hover over mini price chart on asset card
2. Observe any tooltips or highlights
3. Test multiple asset cards

**Expected Result:**
- ✅ Chart is interactive (if applicable)
- ✅ Price range indicators visible
- ✅ High/low values displayed

**Pass Criteria:** Chart displays price trend clearly

---

### Phase 5: Navigation & Links

#### 5.1 Category Link Click ⬜

**Steps:**
1. Click category heading link (e.g., "Trending →")
2. Verify full category page loads
3. Note URL pattern
4. Verify navigation back to Markets page

**Expected Result:**
- ✅ Full category page opens
- ✅ URL format: `/#/markets/category/{categoryName}`
- ✅ More assets displayed (if available)
- ✅ Back navigation works

**Pass Criteria:** Category navigation functions correctly

---

#### 5.2 Tab Navigation ⬜

**Steps:**
1. Click "My Watchlist" tab
2. Verify watchlist content
3. Click "Recommended" tab
4. Verify return to recommended view

**Expected Result:**
- ✅ Tab switches successfully
- ✅ Content updates appropriately
- ✅ Active tab is visually indicated
- ✅ URL may update

**Pass Criteria:** Tab navigation works smoothly

---

### Phase 6: Data Accuracy & Display

#### 6.1 Price Data Verification ⬜

**Steps:**
1. Select a known asset (e.g., Bitcoin)
2. Note displayed price
3. Compare with external source (e.g., CoinGecko)
4. Verify 24h change matches

**Expected Result:**
- ✅ Price within reasonable range of external sources
- ✅ 24h change matches trend
- ✅ USD formatting correct
- ✅ Timestamps reasonable

**Acceptable Variance:** ±2% (due to data source and timing)

**Pass Criteria:** Price data is reasonably accurate

---

#### 6.2 Chart Rendering ⬜

**Steps:**
1. Observe price charts on multiple asset cards
2. Verify charts render correctly
3. Check for any rendering errors in console

**Expected Result:**
- ✅ Charts display without errors
- ✅ Chart data represents 24h trend
- ✅ Visual scaling is appropriate
- ✅ No broken chart placeholders

**Pass Criteria:** All charts render successfully

---

### Phase 7: Performance & Loading

#### 7.1 Initial Load Performance ⬜

**Metrics to Record:**
- Page load time: _____ seconds
- Time to first asset card: _____ seconds
- Time to all categories loaded: _____ seconds
- Number of assets initially displayed: _____

**Expected Result:**
- ✅ Page loads within 5 seconds
- ✅ Progressive loading (if implemented)
- ✅ No long delays for any category

**Pass Criteria:** Page loads performantly

---

#### 7.2 Filter Performance ⬜

**Metrics to Record:**
- Time to filter results: _____ ms
- UI responsiveness during filter: Good / Fair / Poor

**Expected Result:**
- ✅ Filtering completes within 500ms
- ✅ No UI freeze during filtering
- ✅ Loading indicators (if applicable)

**Pass Criteria:** Filtering is smooth and responsive

---

### Phase 8: Error Handling

#### 8.1 Network Error Handling ⬜

**Steps:**
1. Simulate network disconnection (if possible)
2. Attempt to load Markets page
3. Observe error handling

**Expected Result:**
- ✅ Error message displayed
- ✅ Retry option available
- ✅ Graceful degradation
- ✅ No app crash

**Pass Criteria:** Errors handled gracefully

---

#### 8.2 Missing Data Handling ⬜

**Steps:**
1. Observe categories with no assets
2. Verify empty state messaging
3. Confirm no broken UI elements

**Expected Result:**
- ✅ Empty state UI displays
- ✅ Helpful message provided
- ✅ No null/undefined errors
- ✅ UI remains intact

**Pass Criteria:** Missing data doesn't break UI

---

## Test Results Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Page Load** | ⬜ PASS / ❌ FAIL | |
| Trending | ⬜ PASS / ❌ FAIL | Assets: ___ |
| Top Movers | ⬜ PASS / ❌ FAIL | Assets: ___ |
| Trading Volume | ⬜ PASS / ❌ FAIL | Assets: ___ |
| Market Cap | ⬜ PASS / ❌ FAIL | Assets: ___ |
| Recently Added | ⬜ PASS / ❌ FAIL | Assets: ___ |
| One Click DeFi | ⬜ PASS / ❌ FAIL | Assets: ___ |
| **Filtering** | ⬜ PASS / ❌ FAIL | |
| Chain Filters | ⬜ PASS / ❌ FAIL | |
| **Interactions** | ⬜ PASS / ❌ FAIL | |
| Asset Card Click | ⬜ PASS / ❌ FAIL | |
| Favorite Toggle | ⬜ PASS / ❌ FAIL | |
| Chart Rendering | ⬜ PASS / ❌ FAIL | |
| **Navigation** | ⬜ PASS / ❌ FAIL | |
| Category Links | ⬜ PASS / ❌ FAIL | |
| Tab Navigation | ⬜ PASS / ❌ FAIL | |
| **Data Accuracy** | ⬜ PASS / ❌ FAIL | |
| Price Data | ⬜ PASS / ❌ FAIL | |
| **Performance** | ⬜ PASS / ❌ FAIL | Load time: ___s |

---

## Key Findings

### Positive Observations
1.
2.
3.

### Issues Encountered
1.
2.
3.

### Console Warnings/Errors
- (List any React warnings or errors)
- (Note: Expected dev warnings documented in feature discovery report)

---

## Browser Compatibility

Test on multiple browsers:

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | _____ | ⬜ PASS / ❌ FAIL | |
| Firefox | _____ | ⬜ PASS / ❌ FAIL | |
| Safari | _____ | ⬜ PASS / ❌ FAIL | |
| Edge | _____ | ⬜ PASS / ❌ FAIL | |

---

## Responsive Design Testing

Test on various viewport sizes:

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375px) | ⬜ PASS / ❌ FAIL | |
| Tablet (768px) | ⬜ PASS / ❌ FAIL | |
| Desktop (1440px) | ⬜ PASS / ❌ FAIL | |
| Large (1920px) | ⬜ PASS / ❌ FAIL | |

---

## Recommendations

### For Production
1.
2.
3.

### For Future Testing
1. Automate price data accuracy checks
2. Create performance benchmarks
3. Test with various network speeds
4. Verify accessibility compliance
5. Test error recovery scenarios

---

## Related Test Scenarios

- [shapeshift-feature-discovery-report.md](shapeshift-feature-discovery-report.md) - Full feature inventory
- [asset-search-functionality.md](asset-search-functionality.md) - Search testing
- [chain-integration-template.md](chain-integration-template.md) - Chain-specific testing

---

## Conclusion

**TEST STATUS: [PENDING / PASSED / FAILED]**

**Overall Assessment:**
(Summary of markets feature functionality)

**Critical Issues:**
(Any blocking issues found)

**Next Steps:**
1.
2.
3.

---

**Test Executed By:** _____
**Test Execution Date:** _____
**Application Version:** _____
**Environment:** Local / Staging / Production
