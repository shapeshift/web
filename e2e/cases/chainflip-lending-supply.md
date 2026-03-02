# Chainflip Lending: Supply USDC ($101)

Tests the complete supply flow - input validation (minimum check), signing, confirming, and balance invalidation.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked, USDC free balance on State Chain (>= $101 worth)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **supplyMachine.ts**: input -> confirm -> signing -> confirming -> success
- **SupplyInput.tsx**: `isBelowMinimum` blocks submit when amount < `minSupply` (~$100 in asset terms)
- **useChainflipMinimumSupply**: fetches `minimum_supply_amount_usd` from `cf_lending_config` and converts to asset terms via oracle price
- Supply moves funds from State Chain free balance into the lending pool

## Test Case

### 1. Record Before State

Navigate: `/#/chainflip-lending/balances` > click USDC row to reach pool page

Record from "Your Position" section and Supply tab panel:
- Free Balance (e.g. 120.85 USDC)
- Supplied (e.g. 0 USDC)

Screenshot: `01-pool-before-supply.png`

### 2. Open Supply Modal

Click "Supply" button (nth=1, the one inside the tab panel, not the tab itself).

Screenshot: `02-supply-modal-empty.png`

### 3. Test Minimum Validation

Fill the amount input with `1`.

Verify:
- Red minimum warning text appears (e.g. "Minimum supply is 100.XX USDC")
- Submit button is disabled

Screenshot: `03-supply-below-minimum.png`

### 4. Enter Valid Amount

Clear and fill the amount input with `101`.

Verify:
- No minimum warning
- Submit button is enabled

Screenshot: `04-supply-valid-amount.png`

### 5. Submit & Confirm

Click the submit/supply button to proceed to the confirm screen.

Verify: confirm screen shows 101 USDC amount.

Screenshot: `05-supply-confirm.png`

Click "Confirm and Supply" button.

### 6. Sign Transaction

The xstate modal transitions to signing/executing state. A "Confirm" button will appear for native wallet EIP-712 signing. Snapshot to find the "Confirm" button ref and click it.

If a password prompt appears instead, fill `$NATIVE_WALLET_PASSWORD` and click Next/Confirm.

Screenshot: `06-supply-signing.png`

### 7. Wait for Confirmation

After signing, the machine transitions to confirming state. Poll snapshot every 10s, up to 120s timeout.

Expected: confirmation/success state with checkmark and "Supply Successful" text.

Screenshots:
- `07-supply-confirming.png` (intermediate state)
- `08-supply-confirmed.png` (final success)

If timeout: screenshot as `08-supply-timeout.png`, report last state.

### 8. Close Modal & Verify

Click "Done" to close the modal. The pool page behind it should already show updated values (query invalidation fires on confirmation). Verify:

- Free balance decreased by ~101 USDC
- Supplied increased by ~101 USDC

Screenshot: `09-pool-after-supply.png`

### 9. Report

Print PASS/FAIL with before/after values:

```
BEFORE: free=X, supplied=Y
AFTER:  free=X', supplied=Y'
PASS/FAIL: free decreased by ~101, supplied increased by ~101
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr3/supply/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-supply.png | Pool page with current free/supplied values |
| 02 | supply-modal-empty.png | Empty supply modal |
| 03 | supply-below-minimum.png | Amount 1, minimum warning, button disabled |
| 04 | supply-valid-amount.png | Amount 101, no warning, button enabled |
| 05 | supply-confirm.png | Confirm screen with 101 USDC |
| 06 | supply-signing.png | Signing/executing state |
| 07 | supply-confirming.png | Confirming state |
| 08 | supply-confirmed.png | Success (or timeout) |
| 09 | pool-after-supply.png | Pool page with updated free/supplied |
