# Chainflip Lending: Withdraw from State Chain (Egress 0.3 USDC)

Tests the complete egress flow - withdraw USDC from Chainflip free balance to wallet via `withdrawAsset`. Includes destination address selection, signing, egress confirmation via explorer GraphQL polling, tx hash display on success screen, and balance invalidation.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked, USDC free balance on State Chain (>= 0.3 USDC)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **egressMachine.ts**: input -> confirm -> signing -> confirming -> success
- **EgressInput.tsx**: amount input + AccountDropdown destination address (auto-filled from wallet, toggleable to custom)
- **useEgressSign.ts**: calls `encodeWithdrawAsset(amount, cfAsset, { chain, address })`
- **useEgressConfirmation.ts**: snapshots latest withdrawal ID as baseline before signing, then polls Explorer GraphQL for NEW withdrawals (id > baseline) every 60s, 30 attempts = 30min max
- **explorerApi.ts**: `queryLatestWithdrawalId` captures baseline, `queryLiquidityWithdrawalStatus` queries `allLiquidityWithdrawals` with `id: { greaterThan: afterId }` for `broadcastComplete` + `transactionRef`
- Egress moves funds from State Chain free balance to a destination wallet address on the asset's native chain

## Test Case

### 1. Record Before State

Navigate: `/#/chainflip-lending/balances` > click USDC row to reach pool page

Record from "Your Position" section and "Deposit to Chainflip" tab panel:
- Free Balance (e.g. 19.85 USDC)

Screenshot: `01-pool-before-egress.png`

### 2. Open Egress Modal

Click "Withdraw from Chainflip" button (inside the "Deposit to Chainflip" tab panel).

Verify:
- Modal opens with amount input
- Destination address section shows AccountDropdown pre-filled with connected wallet's ETH address
- "Use Custom Address" toggle link is visible

Screenshot: `02-egress-modal-empty.png`

### 3. Enter Amount

Fill the amount input with `0.3`.

Verify:
- Amount shows 0.3
- Free balance row shows available amount
- Submit button is enabled
- Destination address is auto-filled (not empty)

Screenshot: `03-egress-valid-amount.png`

### 4. Submit & Confirm

Click the submit button to proceed to the confirm screen.

Verify:
- Confirm screen shows 0.3 USDC amount
- Destination address is displayed below the amount

Screenshot: `04-egress-confirm.png`

Click "Confirm Withdrawal" button.

### 5. Sign Transaction

The modal transitions to signing/executing state. A "Confirm" button will appear for native wallet EIP-712 signing. Snapshot to find the "Confirm" button ref and click it.

If a password prompt appears instead, fill `$NATIVE_WALLET_PASSWORD` and click Next/Confirm.

Screenshot: `05-egress-signing.png`

### 6. Wait for Egress Confirmation

After signing, the machine transitions to confirming state. The hook polls Chainflip Explorer GraphQL every 60s for the LP withdrawal broadcast.

Poll snapshot every 30s, up to **15 minutes** (900s) timeout. Do NOT take repeated screenshots while waiting - only take one intermediate screenshot and the final result.

Expected: success state with checkmark, "Withdrawal Submitted" text, and a **destination chain transaction hash** displayed as a clickable link.

Screenshots:
- `06-egress-confirming.png` (intermediate state, take once)
- `07-egress-confirmed.png` (final success with tx hash)

If timeout: screenshot as `07-egress-timeout.png`, report last state.

### 7. Verify Transaction Hash

On the success screen, verify:
- Transaction ID section is visible
- Transaction hash is displayed (non-empty, truncated with MiddleEllipsis)
- If clickable link exists, verify href contains the asset's explorer tx link prefix (e.g. `etherscan.io/tx/` for ETH chain assets)

Screenshot: already captured in step 7 (`07-egress-confirmed.png`)

### 8. Close Modal & Verify

Click "Done" to close the modal. The pool page should show updated values (query invalidation fires on confirmation).

Verify:
- Free balance decreased by ~0.3 USDC (may differ slightly due to fees)

Screenshot: `08-pool-after-egress.png`

### 9. Report

Print PASS/FAIL with before/after values and tx hash:

```
BEFORE: free=X
AFTER:  free=X'
TX_HASH: 0x...
EXPLORER_LINK: https://etherscan.io/tx/0x...
PASS/FAIL: free decreased by ~0.3, tx hash present and links to correct chain explorer
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr3/egress/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-egress.png | Pool page with current free balance |
| 02 | egress-modal-empty.png | Empty egress modal with AccountDropdown |
| 03 | egress-valid-amount.png | Amount 0.3, address auto-filled |
| 04 | egress-confirm.png | Confirm screen with 0.3 USDC + destination |
| 05 | egress-signing.png | Signing/executing state |
| 06 | egress-confirming.png | Confirming state (one snapshot only) |
| 07 | egress-confirmed.png | Success with tx hash (or timeout) |
| 08 | pool-after-egress.png | Pool page with updated free balance |
