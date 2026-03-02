# Chainflip Lending: Add Collateral (0.1 USDC, monkey-patched minimum)

Tests the add collateral flow with the monkey-patched $0.10 minimum. This is a smoke test to validate the collateral machine end-to-end before running with real minimums ($10).

**NOTE**: Minimums are monkey-patched to $0.10 in `useChainflipBorrowMinimums.ts` (look for `TODO: rm monkey patch`). If the monkey patch has been removed, this fixture will fail on minimum validation.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked, USDC free balance on State Chain (>= 0.1 USDC)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **collateralMachine.ts**: input -> confirm -> signing -> confirming -> success (mode='add')
- **CollateralInput.tsx**: amount input, free balance as max, `isBelowMinimum` checks `minimumUpdateCollateralAmountUsd` from `useChainflipBorrowMinimums`
- **useCollateralSign.ts**: calls `encodeAddCollateral(null, [{ asset: cfAsset, amount: baseUnit }])`
- **useCollateralConfirmation.ts**: polls `cf_loan_accounts` every 6s for collateral amount increase, 5min timeout
- Add collateral moves funds from free balance to collateral position

## Test Case

### 1. Record Before State

Navigate: `/#/chainflip-lending/balances` > click USDC row to reach pool page

Switch to the Collateral tab in the borrow card (third tab group).

Record from "Your Position" card and Collateral tab:
- Free Balance (from Supply tab)
- Collateral amount (from Collateral tab panel, or Your Position card)

Screenshot: `01-pool-before-collateral.png`

### 2. Open Add Collateral Modal

Click "Add Collateral" button in the Collateral tab panel.

Verify:
- Modal opens with amount input
- Asset icon and symbol (USDC) shown
- "Available to add" row shows free balance
- Max button visible

Screenshot: `02-collateral-modal-empty.png`

### 3. Enter Amount (0.1 USDC)

Fill the amount input with `0.1`.

Verify:
- Amount shows 0.1
- Fiat equivalent shown below (~$0.10)
- No minimum warning (monkey-patched minimum is $0.10)
- Submit button ("Add Collateral") is enabled

Screenshot: `03-collateral-valid-amount.png`

### 4. Submit & Confirm

Click the "Add Collateral" submit button to proceed to confirm screen.

Verify:
- Confirm screen shows 0.1 USDC amount
- "Confirm" or "Confirm and Add Collateral" button visible

Screenshot: `04-collateral-confirm.png`

Click the confirm button.

### 5. Sign Transaction

The modal transitions to signing/executing state with stepper. A "Confirm" button will appear for native wallet EIP-712 signing. Snapshot to find the "Confirm" button ref and click it.

If a password prompt appears instead, fill `$NATIVE_WALLET_PASSWORD` and click Next/Confirm.

Screenshot: `05-collateral-signing.png`

### 6. Wait for Confirmation

After signing, the machine transitions to confirming state. The hook polls `cf_loan_accounts` every 6s for collateral increase.

Poll snapshot every 10s, up to 120s timeout.

Expected: success state with checkmark.

Screenshots:
- `06-collateral-confirming.png` (intermediate state)
- `07-collateral-confirmed.png` (final success, or timeout/error)

### 7. Close Modal & Verify

Click "Done" to close the modal. Verify on pool page:

- Collateral amount increased by ~0.1 USDC
- Free balance decreased by ~0.1 USDC

Screenshot: `08-pool-after-collateral.png`

### 8. Report

Print PASS/FAIL with before/after values:

```
BEFORE: freeBalance=X, collateral=Y
AFTER:  freeBalance=X', collateral=Y'
PASS/FAIL: free decreased by ~0.1, collateral increased by ~0.1
```

## Expected Failure Modes

- **"Minimum collateral is $10"** error: monkey patch was removed, revert to real $10 fixture
- **"No free balance"**: need to deposit USDC to Chainflip first (use deposit fixture)
- **Transaction rejected on-chain**: amount below protocol minimum despite UI monkey patch. This means the on-chain minimum is enforced and the monkey patch only affects UI validation.

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr4/add-collateral-monkey-patch/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-collateral.png | Pool page with current free/collateral values |
| 02 | collateral-modal-empty.png | Empty add collateral modal |
| 03 | collateral-valid-amount.png | Amount 0.1, no warning, button enabled |
| 04 | collateral-confirm.png | Confirm screen with 0.1 USDC |
| 05 | collateral-signing.png | Signing/executing state |
| 06 | collateral-confirming.png | Confirming state |
| 07 | collateral-confirmed.png | Success (or timeout/error) |
| 08 | pool-after-collateral.png | Pool page with updated values |
