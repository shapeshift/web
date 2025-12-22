# Test Scenario: Asset Swap Flow

**Feature**: DEX aggregator asset swapping
**Priority**: Critical
**Last Updated**: 2025-01-18
**Last Tested**: Not yet tested
**Status**: Active

## Prerequisites

- Dev server running on `localhost:3000`
- Wallet connected with test funds
- Test wallet should have:
  - Small amount of ETH for gas
  - Small amount of source asset (e.g., USDC)
- Network: Ethereum mainnet or testnet

## Test Steps

### 1. Navigate to Trade Page

**Action**: Navigate to Trade/Swap page
**Expected Result**: Trade interface loads successfully

**Browser MCP Command**:
```javascript
// Navigate to trade
browser_click({ element: "Trade navigation link", ref: "..." })
// OR
browser_navigate({ url: "http://localhost:3000/trade" })
```

**Validation Points**:
- [ ] Trade interface renders
- [ ] Asset selector dropdowns visible
- [ ] Amount input fields visible
- [ ] "Review Trade" or "Get Quote" button disabled initially
- [ ] No console errors on page load

### 2. Select Source Asset

**Action**: Click source asset dropdown and select an asset (e.g., USDC)
**Expected Result**: Asset selected, balance displayed

**Validation Points**:
- [ ] Asset dropdown opens with search
- [ ] Assets displayed with icons and symbols
- [ ] Balance shown for each asset
- [ ] Search functionality works
- [ ] Selected asset updates in input
- [ ] Wallet balance displayed below input
- [ ] "Max" button appears

### 3. Select Destination Asset

**Action**: Click destination asset dropdown and select different asset (e.g., ETH)
**Expected Result**: Destination asset selected

**Validation Points**:
- [ ] Cannot select same asset as source
- [ ] Asset selected successfully
- [ ] Icon and symbol update
- [ ] Quote preparation begins

### 4. Enter Amount

**Action**: Enter amount to swap (e.g., "10" USDC)
**Expected Result**: Amount validation and quote request

**Validation Points**:
- [ ] Amount accepts decimal input
- [ ] Input validates against balance
- [ ] Error shown if amount > balance
- [ ] Error shown if amount too low for swap
- [ ] Loading indicator shows while fetching quote
- [ ] Destination amount updates with quote

### 5. Review Quote

**Action**: Wait for quote to load
**Expected Result**: Quote details displayed

**Validation Points**:
- [ ] Destination amount calculated
- [ ] Exchange rate displayed
- [ ] Price impact shown (if significant)
- [ ] Estimated gas fee shown
- [ ] DEX aggregator source shown (e.g., "Best Rate via 0x")
- [ ] Slippage tolerance displayed
- [ ] "Review Trade" button enabled
- [ ] Quote refreshes periodically

### 6. Test Max Button

**Action**: Click "Max" button on source asset
**Expected Result**: Maximum available amount populated

**Validation Points**:
- [ ] Amount set to wallet balance
- [ ] For gas token (ETH), reserves amount for gas
- [ ] Quote updates with max amount
- [ ] No errors with max amount

### 7. Open Trade Review

**Action**: Click "Review Trade" button
**Expected Result**: Trade review modal/page opens

**Validation Points**:
- [ ] Review modal displays
- [ ] Source and destination amounts shown
- [ ] Exchange rate displayed
- [ ] Price impact shown
- [ ] Estimated gas fee shown
- [ ] Total cost breakdown visible
- [ ] Slippage tolerance editable
- [ ] "Confirm Trade" button visible
- [ ] "Cancel" or back option visible

### 8. Adjust Slippage (Optional)

**Action**: Click slippage settings, adjust value
**Expected Result**: Slippage tolerance updated

**Validation Points**:
- [ ] Slippage settings accessible
- [ ] Preset options available (0.5%, 1%, 3%)
- [ ] Custom slippage input works
- [ ] Warning shown for high slippage
- [ ] Quote updates if needed

### 9. Test Trade Cancellation

**Action**: Click "Cancel" or back button
**Expected Result**: Returns to trade input form

**Validation Points**:
- [ ] Returns to previous screen
- [ ] Input values preserved
- [ ] No errors on cancellation
- [ ] Quote remains valid

### 10. Confirm Trade (Dry Run)

**Action**: Re-open review and click "Confirm Trade"
**Expected Result**: Wallet transaction prompt appears (DON'T ACTUALLY SIGN)

**Validation Points**:
- [ ] Transaction preparation succeeds
- [ ] Wallet popup appears (MetaMask/WalletConnect)
- [ ] Transaction details correct in wallet
- [ ] Gas fee reasonable
- [ ] Can cancel transaction safely

### 11. Verify Error Handling

**Action**: Test various error scenarios
**Expected Result**: Errors handled gracefully

**Test Cases**:
- Insufficient balance → Error message shown
- Insufficient gas → Error message shown
- Quote expiry → Refreshes automatically
- Network disconnection → Error message, retry option
- Asset not supported → Cannot select or clear warning

### 12. Test Asset Flip

**Action**: Click swap direction button (↕️)
**Expected Result**: Source and destination assets swap

**Validation Points**:
- [ ] Assets swap positions
- [ ] Amounts update accordingly
- [ ] Quote recalculates
- [ ] No errors during flip

## Edge Cases

### Stale Quote
- Wait for quote to expire (usually 30-60s)
- Should auto-refresh or show warning
- "Confirm" should be disabled or trigger refresh

### Multiple Concurrent Quotes
- Change asset while quote loading
- Should cancel previous quote request
- Latest quote should display

### Gas Price Spike
- If gas price increases significantly
- Should warn user or update estimate
- Should allow user to adjust gas settings

### MEV Protection
- Check if MEV protection is offered
- Verify toggle works if available
- Confirm in transaction details

### Cross-Chain Swaps
- If supported, test cross-chain bridge swaps
- Verify chain indicators correct
- Check approval requirements

## Known Issues

- None currently documented

## Related Scenarios

- `wallet-connection-flow.md`
- `asset-approval-flow.md`
- `transaction-history.md`
- `chain-switching-flow.md`

## Notes

The swap flow is the core revenue-generating feature. Any issues here directly impact user experience and business metrics. Test thoroughly with multiple asset pairs and amounts.

Pay special attention to:
- Quote accuracy and refresh timing
- Error message clarity
- Transaction failure handling
- Gas estimation accuracy
