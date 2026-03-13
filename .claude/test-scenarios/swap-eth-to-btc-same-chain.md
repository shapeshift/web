# Test Scenario: ETH to BTC Swap (Same-Chain Bitcoin Network)

**Date:** 2025-12-18
**Test Type:** End-to-End Same-Chain Swap
**Feature:** Trade/Swap
**Status:** 📝 TEMPLATE

---

## Test Configuration

### Trading Pair
- **Source Asset:** ETH (Ethereum)
- **Source Chain:** Ethereum (EIP-155:1)
- **Destination Asset:** BTC (Bitcoin)
- **Destination Chain:** Bitcoin (BIP-122)
- **Swap Amount:** TBD
- **Expected Output:** TBD (after fees and slippage)

### Wallet Configuration
- **Wallet Type:** Native ShapeShift wallet or connected wallet
- **Initial ETH Balance:** TBD
- **Initial BTC Balance:** TBD
- **Gas Token:** ETH

---

## Prerequisites

- [ ] ShapeShift Web running locally or on testnet
- [ ] Wallet connected and unlocked
- [ ] Sufficient ETH balance for swap + gas fees
- [ ] BTC address available for receiving

---

## Test Execution Steps

### 1. Navigation & Setup ⬜

**Action:** Navigate to trade page and configure swap pair

**Steps:**
1. Open ShapeShift at `${PORTLESS_URL:-http://localhost:3000}/#/trade`
2. Ensure wallet is connected
3. Select ETH as source asset
4. Verify Ethereum is source chain
5. Select BTC as destination asset
6. Note initial balances for both assets

**Expected Result:**
- ✅ Trade page loads successfully
- ✅ Asset selectors display correctly
- ✅ Balances are visible
- ✅ Receive address is displayed

**Pass Criteria:** All UI elements render and balances are accurate

---

### 2. Amount Input & Quote Fetching ⬜

**Action:** Enter swap amount to trigger quote aggregation

**Steps:**
1. Enter desired ETH amount (e.g., 0.01 ETH)
2. Wait for quote aggregation to complete
3. Observe available swappers
4. Note gas fees and time estimates

**Expected Result:**
- ✅ Quote aggregation completes within 30 seconds
- ✅ At least one swapper provides a quote
- ✅ Output amount is calculated
- ✅ Gas fees are displayed
- ✅ Exchange rate is shown

**Quote Analysis:**
- Number of quotes received: _____
- Best rate swapper: _____
- Output amount: _____
- Estimated time: _____
- Gas fee: _____

**Pass Criteria:** Multiple quotes received with clear pricing information

---

### 3. Trade Preview ⬜

**Action:** Preview the swap details before execution

**Steps:**
1. Click "Preview Trade" button
2. Review preview screen details:
   - Source amount and asset
   - Destination amount and asset
   - Selected swapper
   - Exchange rate
   - Gas fees
   - Receive address
   - Time estimate

**Expected Result:**
- ✅ Preview modal opens
- ✅ All swap details are accurate
- ✅ Swapper is identified
- ✅ Fees are clearly displayed
- ✅ Receive address is correct

**Pass Criteria:** Preview information matches trade page details

---

### 4. Transaction Execution ⬜

**Action:** Execute the swap transaction

**Steps:**
1. Click "Confirm and Trade" button
2. Status changes to "Awaiting swap via [Swapper]"
3. Review transaction details in wallet
4. Click "Sign & Swap" button
5. Observe signing process
6. Wait for transaction to broadcast

**Expected Result:**
- ✅ Transaction details appear in wallet
- ✅ Gas fees are reasonable
- ✅ Signing completes successfully
- ✅ Transaction broadcasts to network
- ✅ Transaction hash is generated

**Transaction Details:**
- Transaction hash: _____
- Network fee: _____
- Swapper: _____

**Pass Criteria:** Transaction successfully signed and broadcast

---

### 5. Status Monitoring ⬜

**Action:** Monitor transaction progress and UI updates

**Observations:**

**5.1 Pending Indicator (Top Bar)**
- Before: Status of "Pending Transactions" button
- During: "1 Pending" badge with spinner
- After: Badge cleared

**5.2 Balance Updates**
- ETH Balance Before: _____
- ETH Balance After: _____
- ETH Deducted: _____
- BTC Balance Before: _____
- BTC Balance After: _____
- BTC Received: _____

**5.3 URL Navigation**
- Redirected back to trade form: ✅ / ❌
- URL format correct: ✅ / ❌

**Expected Result:**
- ✅ Pending indicator shows during swap
- ✅ Source balance decreases correctly
- ✅ Destination balance increases (may take time)
- ✅ UI remains responsive

**Pass Criteria:** All status indicators update accurately in real-time

---

### 6. Toast Notification Verification ⬜

**Action:** Verify toast notification appears and updates

**Details:**
- **Location:** Bottom-right corner of application
- **Initial Message:** "Your swap of [amount] [asset] to [amount] [asset] is being processed."
- **Final Message:** "Your swap of [amount] [asset] to [amount] [asset] is complete."

**Visual Elements:**
- ✅ Chain icons (source and destination)
- ✅ Loading spinner (during processing)
- ✅ Green checkmark (on completion)
- ✅ Close button (X)

**Expected Result:**
- ✅ Toast appears at bottom-right
- ✅ Message updates from processing to complete
- ✅ Icons display correctly
- ✅ Toast is dismissible

**Pass Criteria:** Toast notification lifecycle completes successfully

---

### 7. Action Center Verification ⬜

**Action:** Verify swap appears in Action Center (Notifications panel)

**Steps:**
1. Click "Pending Transactions" button
2. Locate swap transaction in list
3. Verify transaction details

**Expected Details:**
- **Type:** Swap
- **Time:** Relative timestamp (e.g., "a few minutes ago")
- **Message:** "Your swap of [amount] [asset] to [amount] [asset] is complete."
- **Status:** "Confirmed" (green badge)
- **Icons:** Swap indicator with chain icons
- **Clickable:** Yes, to view details

**Expected Result:**
- ✅ Swap appears in Action Center
- ✅ Status shows "Confirmed"
- ✅ Transaction details are accurate
- ✅ Timestamp is reasonable

**Pass Criteria:** Transaction logged in Action Center with correct status

---

### 8. Blockchain Confirmation ⬜

**Action:** Verify transaction on blockchain explorer

**Steps:**
1. Copy transaction hash
2. Navigate to appropriate block explorer
   - Ethereum: etherscan.io
   - Bitcoin: blockchain.com or blockchair.com
3. Verify transaction details

**Expected Result:**
- ✅ Transaction found on blockchain
- ✅ Status: Confirmed
- ✅ Source address matches
- ✅ Destination address matches
- ✅ Amount matches
- ✅ Gas fees match estimate

**Explorer Links:**
- Ethereum TX: _____
- Bitcoin TX (if cross-chain): _____

**Pass Criteria:** Transaction confirmed on both source and destination chains

---

## Test Results Summary

| Criteria | Status | Notes |
|----------|--------|-------|
| Navigate to trade page | ⬜ PASS / ❌ FAIL | |
| Select source asset (ETH) | ⬜ PASS / ❌ FAIL | |
| Select destination asset (BTC) | ⬜ PASS / ❌ FAIL | |
| Enter swap amount | ⬜ PASS / ❌ FAIL | |
| Quote aggregation | ⬜ PASS / ❌ FAIL | Quotes received: ___ |
| Preview trade | ⬜ PASS / ❌ FAIL | |
| Execute transaction | ⬜ PASS / ❌ FAIL | |
| Toast notification - Processing | ⬜ PASS / ❌ FAIL | |
| Toast notification - Complete | ⬜ PASS / ❌ FAIL | |
| Source balance deduction | ⬜ PASS / ❌ FAIL | Amount: ___ |
| Destination balance increase | ⬜ PASS / ❌ FAIL | Amount: ___ |
| Action Center entry | ⬜ PASS / ❌ FAIL | |
| Blockchain confirmation | ⬜ PASS / ❌ FAIL | |

---

## Key Findings

### Positive Observations
1. (Document successful aspects)
2.
3.

### Issues Encountered
1. (Document any issues)
2.
3.

### Performance Metrics
- **Quote Load Time:** _____ seconds
- **Transaction Sign Time:** _____ seconds
- **Estimated Swap Time:** _____ seconds
- **Actual Swap Time:** _____ seconds
- **UI Response Time:** _____ seconds

---

## Technical Details

### Swapper Information
- **Selected Swapper:** _____
- **Swapper Fee:** _____
- **Swapper Time Estimate:** _____

### Asset Identifiers
- **Source:** `eip155:1/slip44:60` (ETH on Ethereum)
- **Destination:** `bip122:000000000019d6689c085ae165831e93/slip44:0` (BTC)

### Fee Breakdown
- **Network Gas Fee:** _____ ETH ($_____)
- **Swapper Fee:** Included in quote
- **Slippage:** _____ %
- **Total Cost:** _____ ETH ($_____)

---

## Edge Cases to Test

### Amount Variations
- [ ] Minimum swap amount (dust)
- [ ] Maximum swap amount (liquidity limits)
- [ ] Round numbers (e.g., 0.1 ETH)
- [ ] Precise decimal amounts (e.g., 0.01234567 ETH)

### Network Conditions
- [ ] High gas prices
- [ ] Network congestion
- [ ] Low liquidity
- [ ] Multiple pending transactions

### Wallet Scenarios
- [ ] Insufficient ETH balance
- [ ] Insufficient gas for transaction
- [ ] Transaction rejection
- [ ] Network switch required

### UI Scenarios
- [ ] Page refresh during swap
- [ ] Browser tab switch
- [ ] Network disconnection
- [ ] Wallet disconnection

---

## Recommendations

### For Production
1. (Recommendations based on test results)
2.
3.

### For Future Testing
1. Test with various swap amounts (small, medium, large)
2. Test during different network conditions
3. Compare multiple swappers for same pair
4. Test error recovery scenarios
5. Verify slippage tolerance handling

---

## Related Test Scenarios

- [relay-usdc-arbitrum-to-solana.md](relay-usdc-arbitrum-to-solana.md) - Cross-chain swap example
- [limit-orders.md](limit-orders.md) - Limit order testing
- [chain-integration-template.md](chain-integration-template.md) - Chain integration verification

---

## Conclusion

**TEST STATUS: [PENDING / PASSED / FAILED]**

**Summary:**
(Provide final summary of test results)

**Critical Issues:**
(List any blocking issues)

**Next Steps:**
1. (Actions based on test results)
2.
3.

---

**Test Executed By:** _____
**Test Execution Date:** _____
**Application Version:** _____
**Environment:** Local / Testnet / Mainnet
