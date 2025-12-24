# Test Scenario: Wallet Connection Flow

**Feature**: Wallet connection and disconnection
**Priority**: Critical
**Last Updated**: 2025-01-18
**Last Tested**: Not yet tested
**Status**: Active

## Prerequisites

- Dev server running on `localhost:3000`
- Browser with MetaMask extension installed (or ability to test without actual wallet)
- No wallet currently connected

## Test Steps

### 1. Navigate to Application

**Action**: Open browser and navigate to `http://localhost:3000`
**Expected Result**: Application loads successfully, showing "Connect Wallet" button

**Validation Points**:
- [ ] Page loads without console errors
- [ ] Header shows "Connect Wallet" button
- [ ] No authentication state persisted from previous session
- [ ] Portfolio section shows empty/placeholder state

### 2. Open Wallet Connection Modal

**Action**: Click "Connect Wallet" button
**Expected Result**: Wallet selection modal opens

**Browser MCP Command**:
```javascript
// Click connect wallet button
browser_click({ element: "Connect Wallet button", ref: "..." })
```

**Validation Points**:
- [ ] Modal appears with smooth animation
- [ ] Multiple wallet options displayed (MetaMask, WalletConnect, Ledger, etc.)
- [ ] Modal has proper backdrop overlay
- [ ] Close button visible in modal header
- [ ] Each wallet option has icon and name

### 3. Select Wallet Provider

**Action**: Click on a wallet provider (e.g., MetaMask)
**Expected Result**: Wallet connection process initiates

**Validation Points**:
- [ ] Loading state appears
- [ ] External wallet popup/tab opens (if using real wallet)
- [ ] No console errors during connection
- [ ] Modal shows "Connecting..." state

### 4. Verify Connected State

**Action**: Complete wallet connection (approve in wallet if real)
**Expected Result**: Application updates to show connected state

**Validation Points**:
- [ ] "Connect Wallet" button changes to wallet address/icon
- [ ] Portfolio loads with wallet balances
- [ ] Account menu accessible (click wallet button)
- [ ] Redux state updated with `walletId`
- [ ] Local storage persisted with connection info
- [ ] No console errors after connection

### 5. Test Account Menu

**Action**: Click connected wallet button to open account menu
**Expected Result**: Account menu opens with options

**Validation Points**:
- [ ] Account menu shows wallet address (truncated)
- [ ] "Disconnect" option visible
- [ ] Account switching option visible (if multiple accounts)
- [ ] Copy address option visible
- [ ] View on explorer option visible
- [ ] Current network/chain displayed

### 6. Disconnect Wallet

**Action**: Click "Disconnect" button in account menu
**Expected Result**: Wallet disconnects, app returns to initial state

**Validation Points**:
- [ ] Wallet disconnects successfully
- [ ] Button changes back to "Connect Wallet"
- [ ] Portfolio clears/shows empty state
- [ ] Redux state clears wallet info
- [ ] Local storage cleared appropriately
- [ ] No console errors during disconnection

### 7. Verify Persistence

**Action**: Reconnect wallet, then refresh page
**Expected Result**: Wallet connection persists across refresh

**Validation Points**:
- [ ] After refresh, wallet still connected
- [ ] Portfolio loads automatically
- [ ] No re-authentication required
- [ ] Redux state rehydrates correctly

## Edge Cases

### Close Modal Without Connecting
- Click backdrop or close button
- Modal should close without errors
- App returns to disconnected state

### Browser Refresh During Connection
- Refresh while connection modal is open
- Should return to clean disconnected state
- No stuck loading states

### Multiple Accounts
- If wallet has multiple accounts
- Should show account switcher
- Switching should update portfolio

### Network Mismatch
- If wallet on unsupported network
- Should show network switch prompt
- Should handle gracefully

## Known Issues

- None currently documented

## Screenshots

- `screenshots/wallet-connection/initial-state.png`
- `screenshots/wallet-connection/modal-open.png`
- `screenshots/wallet-connection/connected-state.png`

## Related Scenarios

- `account-switching-flow.md`
- `portfolio-loading.md`
- `chain-switching-flow.md`

## Notes

This is the most critical user flow. Any failure here renders the app unusable. Test thoroughly after any wallet integration changes.
