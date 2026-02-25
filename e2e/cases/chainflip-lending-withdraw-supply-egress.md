# Chainflip Lending: Withdraw Supply with Egress (~101 USDC Full Withdrawal)

Tests the complete withdraw-from-supply flow with "Also withdraw to wallet" checkbox checked. This is a full withdrawal (supply balance < 2x minimum), so the amount is pre-filled and non-editable. Machine tries batch (removeLenderFunds + withdrawAsset) first, falls back to separate calls on error. Includes EIP-712 signing, two-phase confirmation (supply position decrease + egress broadcast), tx hash display, and balance invalidation.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked, USDC supply position on State Chain (~101 USDC, below 2x $100 minimum = full withdrawal only)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **withdrawMachine.ts**: input -> confirm -> signing_batch -> [on error: signing_remove -> signing_egress] -> confirming -> success
- **WithdrawInput.tsx**: `isFullWithdrawalOnly` pre-fills amount (non-editable), "Also withdraw to wallet" checkbox enables AccountDropdown destination address
- **useWithdrawBatch.ts**: batch encodes `removeLenderFunds(null for full) + withdrawAsset(amount, cfAsset, { chain, address })`
- **useWithdrawConfirmation.ts**: Phase 1 polls `cf_account_info` lending_positions for supply decrease (6s interval, 20 attempts). Phase 2 snapshots latest withdrawal ID as baseline via `queryLatestWithdrawalId`, then polls Explorer GraphQL for NEW withdrawals (id > baseline) every 60s, 30 attempts = 30min max. Cleanup (reset baselineId, remove queries) only fires when machine resets to input, NOT during success/error transitions.
- **explorerApi.ts**: `queryLatestWithdrawalId` captures baseline (highest existing withdrawal ID for address/asset/chain), `queryLiquidityWithdrawalStatus` queries `allLiquidityWithdrawals` with `id: { greaterThan: afterId }` filtering for `broadcastComplete` + `transactionRef`

## Test Case

### 1. Record Before State

Navigate: `/#/chainflip-lending/balances` > click USDC row to reach pool page

Record from "Your Position" section:
- Supply Position (e.g. ~101 USDC)
- Free Balance (e.g. ~18.95 USDC)

Screenshot: `01-pool-before-withdraw.png`

### 2. Open Withdraw Modal

In the "Supply" tab panel, click "Withdraw" button.

Verify:
- Modal opens showing asset symbol (USDC) and icon
- Amount is PRE-FILLED with full supply position (non-editable, since isFullWithdrawalOnly)
- Available balance row shows the supply position amount
- "Also withdraw to wallet" checkbox is visible and unchecked by default

Screenshot: `02-withdraw-modal-full-amount.png`

### 3. Enable "Also Withdraw to Wallet"

Check the "Also withdraw to wallet" checkbox.

Verify:
- Destination address section appears
- AccountDropdown is pre-filled with connected wallet's ETH address
- "Use Custom Address" toggle link is visible
- Submit button is enabled

Screenshot: `03-withdraw-egress-enabled.png`

### 4. Submit & Confirm

Click the submit button to proceed to the confirm screen.

Verify:
- Confirm screen shows the full withdrawal amount (~101 USDC)
- "Withdraw to wallet" indication is shown
- Destination address is displayed

Screenshot: `04-withdraw-confirm.png`

Click "Confirm Withdrawal" button.

### 5. Sign Transaction(s)

The modal transitions to signing state. For native wallet, an EIP-712 "Confirm" button will appear.

**Batch path** (happy path): One "Confirm" click for the batch call (removeLenderFunds + withdrawAsset combined).

**Fallback path** (if batch fails): Two separate "Confirm" clicks - first for removeLenderFunds, then for withdrawAsset. The machine automatically falls back.

Click "Confirm" for each signing prompt that appears. If a password prompt appears, fill `$NATIVE_WALLET_PASSWORD` and click Next/Confirm.

Screenshot: `05-withdraw-signing.png`

### 6. Wait for Confirmation (Two Phases)

After signing, the machine transitions to confirming state. Two-phase polling begins:

**Phase 1 - Supply Position Decrease** (fast, ~6s interval):
- Polls `cf_account_info` to detect lending_positions decrease
- Should complete within 1-2 minutes

**Phase 2 - Egress Broadcast** (slower, ~60s interval):
- Once supply decreased, snapshots the latest withdrawal ID for address/asset/chain as baseline via `queryLatestWithdrawalId`
- Polls Chainflip Explorer GraphQL (`allLiquidityWithdrawals` with `id: { greaterThan: baselineId }`) every 60s for up to 30 attempts (30min max)
- Looks for `broadcastComplete === true` AND `transactionRef` being non-null on the NEW withdrawal (id > baseline)
- This filtering ensures we match only the CURRENT egress, not stale/previous withdrawals for the same address
- May take several minutes for Chainflip to broadcast to destination chain

Poll snapshot every 30s, up to **15 minutes** (900s) total timeout. Do NOT take repeated screenshots while waiting - only take one intermediate screenshot and the final result.

Expected: success state with checkmark, withdrawal confirmed text, and a **destination chain transaction hash** displayed as a clickable link.

Screenshots:
- `06-withdraw-confirming.png` (intermediate state, take once)
- `07-withdraw-confirmed.png` (final success with tx hash)

If timeout: screenshot as `07-withdraw-timeout.png`, report last state.

### 7. Verify Transaction Hash

On the success screen, verify:
- Transaction ID section is visible
- Transaction hash is displayed (non-empty, truncated with MiddleEllipsis)
- If clickable link exists, verify href contains the asset's explorer tx link prefix (e.g. `etherscan.io/tx/` for ETH chain assets)

Screenshot: already captured in step 6 (`07-withdraw-confirmed.png`)

### 8. Close Modal & Verify

Click "Done" to close the modal. The pool page should show updated values (query invalidation fires on confirmation).

Verify:
- Supply Position decreased to 0 (full withdrawal)
- Free Balance increased if egress was to the wallet (may reflect after chain confirmation)
- Or if egress already completed, the USDC went directly to wallet

Screenshot: `08-pool-after-withdraw.png`

### 9. Report

Print PASS/FAIL with before/after values and tx hash:

```
BEFORE: supply=X, free=Y
AFTER:  supply=X', free=Y'
TX_HASH: 0x...
EXPLORER_LINK: https://etherscan.io/tx/0x...
PASS/FAIL: supply decreased to 0, tx hash present and links to correct chain explorer
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr3/withdraw-supply-egress/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-withdraw.png | Pool page with current supply + free balance |
| 02 | withdraw-modal-full-amount.png | Full withdrawal amount pre-filled |
| 03 | withdraw-egress-enabled.png | Checkbox checked, AccountDropdown visible |
| 04 | withdraw-confirm.png | Confirm screen with amount + destination |
| 05 | withdraw-signing.png | Signing state (batch or fallback) |
| 06 | withdraw-confirming.png | Confirming state (one snapshot only) |
| 07 | withdraw-confirmed.png | Success with tx hash (or timeout) |
| 08 | pool-after-withdraw.png | Pool page with updated balances |
