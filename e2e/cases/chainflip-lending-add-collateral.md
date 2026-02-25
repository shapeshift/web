# Chainflip Lending: Add Collateral (10 USDC)

Tests the add collateral flow with the real on-chain minimum ($10 = `minimum_update_collateral_amount_usd`).

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked, USDC free balance on State Chain (>= 10 USDC)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **collateralMachine.ts**: input -> confirm -> signing -> confirming -> success (mode='add')
- **CollateralInput.tsx**: amount input, free balance as max, `isBelowMinimum` checks `minimumUpdateCollateralAmountUsd`
- **useCollateralSign.ts**: calls `encodeAddCollateral(null, [{ asset: cfAsset, amount: baseUnit }])`
- **useCollateralConfirmation.ts**: polls `cf_loan_accounts` every 6s for collateral increase, 5min timeout

## Test Case

### 1. Record Before State

Navigate: `/#/chainflip-lending/balances` > click USDC row to reach pool page

Switch to Collateral tab. Record:
- Free Balance
- Collateral amount

Screenshot: `01-pool-before-collateral.png`

### 2. Test Minimum Validation

Open "Add Collateral" modal. Fill amount with `1`.

Verify:
- Red minimum warning text appears (e.g. "Minimum collateral is $10")
- Submit button disabled

Screenshot: `02-collateral-below-minimum.png`

### 3. Enter Valid Amount

Clear and fill amount with `10`.

Verify:
- No minimum warning
- Fiat equivalent ~$10
- Submit button enabled

Screenshot: `03-collateral-valid-amount.png`

### 4. Submit & Confirm

Click submit. Verify confirm screen shows 10 USDC. Click confirm.

Screenshot: `04-collateral-confirm.png`

### 5. Sign Transaction

Snapshot for "Confirm" button (native wallet EIP-712). Click it.

Screenshot: `05-collateral-signing.png`

### 6. Wait for Confirmation

Poll snapshot every 10s, up to 120s timeout. Expected: success state.

Screenshots:
- `06-collateral-confirming.png`
- `07-collateral-confirmed.png`

### 7. Close & Verify

Click "Done". Verify:
- Collateral increased by ~10 USDC
- Free balance decreased by ~10 USDC

Screenshot: `08-pool-after-collateral.png`

### 8. Report

```
BEFORE: freeBalance=X, collateral=Y
AFTER:  freeBalance=X', collateral=Y'
PASS/FAIL: free decreased by ~10, collateral increased by ~10
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr4/add-collateral/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-collateral.png | Pool page before |
| 02 | collateral-below-minimum.png | Amount 1, minimum warning |
| 03 | collateral-valid-amount.png | Amount 10, enabled |
| 04 | collateral-confirm.png | Confirm screen |
| 05 | collateral-signing.png | Signing state |
| 06 | collateral-confirming.png | Confirming state |
| 07 | collateral-confirmed.png | Success |
| 08 | pool-after-collateral.png | Pool page after |
