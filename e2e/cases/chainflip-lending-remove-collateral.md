# Chainflip Lending: Remove Collateral (USDC)

Tests removing collateral from the lending position back to free balance. If loans are active, removal is constrained by LTV - can only remove excess collateral above the required amount for target LTV.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked with collateral on State Chain
- No active loans (for full removal) or loans with excess collateral (for partial removal)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **collateralMachine.ts**: input -> confirm -> signing -> confirming -> success (mode='remove')
- **CollateralInput.tsx**: mode='remove' shows "Available to remove", max removable computed from `(collateral_fiat - borrowed / target_ltv) / price`, LTV gauge with projection
- **useCollateralSign.ts**: calls `encodeRemoveCollateral([{ asset: cfAsset, amount: baseUnit }])`
- **useCollateralConfirmation.ts**: polls `cf_loan_accounts` for collateral decrease, 5min timeout
- **Minimums**: $10 per update (monkey-patched to $0.10)

## Test Case

### 1. Record Before State

Navigate to USDC pool page. Switch to Collateral tab.

Record:
- Collateral amount
- Free balance
- Outstanding borrowed amount (if any)
- "Available to remove" (shown in modal)

Screenshot: `01-pool-before-remove.png`

### 2. Open Remove Collateral Modal

Click "Remove Collateral" button in the Collateral tab panel.

Verify:
- Modal opens with amount input
- Label says "Remove Collateral" (not "Add")
- "Available to remove" shows the removable amount (may be less than total collateral if loans are active)
- If active loans: LTV gauge visible with current LTV
- If no loans: full collateral amount is available to remove

Screenshot: `02-remove-modal-empty.png`

### 3. Enter Amount

Enter the removal amount. Options:
- **No loans**: enter full collateral amount via Max
- **With loans**: enter up to the available-to-remove amount

Verify:
- Amount accepted
- If loans active: LTV gauge shows projected LTV after removal (should stay below 80%)
- Submit button enabled

Screenshot: `03-remove-valid-amount.png`

### 4. Submit & Confirm

Click "Remove Collateral" submit button. Verify confirm screen. Click confirm.

Screenshot: `04-remove-confirm.png`

### 5. Sign Transaction

Snapshot for "Confirm" button (native wallet EIP-712). Click it.

Screenshot: `05-remove-signing.png`

### 6. Wait for Confirmation

Polls `cf_loan_accounts` every 6s for collateral decrease. 120s timeout.

Screenshots:
- `06-remove-confirming.png`
- `07-remove-confirmed.png`

### 7. Close & Verify

Click "Done". Verify:
- Collateral decreased by removal amount
- Free balance increased by removal amount
- If was full removal: "Add Collateral" button remains, "Remove Collateral" now disabled (no collateral)

Screenshot: `08-pool-after-remove.png`

### 8. Report

```
BEFORE: collateral=C, freeBalance=F
AFTER:  collateral=C', freeBalance=F'
PASS/FAIL: collateral decreased, free balance increased by matching amount
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr4/remove-collateral/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-remove.png | Pool page before |
| 02 | remove-modal-empty.png | Empty remove modal |
| 03 | remove-valid-amount.png | Valid amount entered |
| 04 | remove-confirm.png | Confirm screen |
| 05 | remove-signing.png | Signing state |
| 06 | remove-confirming.png | Confirming state |
| 07 | remove-confirmed.png | Success |
| 08 | pool-after-remove.png | Pool page after |
