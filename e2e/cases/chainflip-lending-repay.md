# Chainflip Lending: Repay Loan (Full Repayment)

Tests the full repayment flow. Requires an existing loan and sufficient free balance to cover outstanding debt.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked with an active loan (run borrow fixture first)
- Sufficient USDC free balance on State Chain to cover the outstanding debt
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **repayMachine.ts**: input -> confirm -> signing -> confirming -> success
- **RepayInput.tsx**: outstanding debt display, "Full Repayment" toggle (Switch), partial amount input, `isFullRepayment` flag
- **useRepaySign.ts**: calls `encodeMakeRepayment(loanId, 'full')` for full, `encodeMakeRepayment(loanId, amount)` for partial
- **useRepayConfirmation.ts**: polls `cf_loan_accounts` every 6s - for full repayment checks loan disappears, for partial checks principal decrease, 5min timeout
- **Minimums**: partial repayment min = $10 (monkey-patched $0.10). Full repayment has no minimum.

## Test Case

### 1. Record Before State

Navigate to USDC pool page. Switch to Repay tab.

Record:
- Outstanding debt (shown in Repay tab panel)
- Free balance (from Supply tab)
- Number of active loans

Screenshot: `01-pool-before-repay.png`

### 2. Open Repay Modal

Click "Repay" button in the Repay tab panel.

Verify:
- Modal opens showing outstanding debt amount
- "Full Repayment" toggle (Switch) visible, OFF by default
- Partial amount input visible
- Available balance shown

Screenshot: `02-repay-modal-empty.png`

### 3. Toggle Full Repayment

Click the "Full Repayment" switch to ON.

Verify:
- Switch turns blue/active
- Partial amount input disappears (replaced by full debt amount)
- Submit button becomes enabled (assuming sufficient free balance)
- If free balance < debt: "Insufficient balance" warning shown, button disabled

Screenshot: `03-repay-full-toggle.png`

### 4. Submit & Confirm

Click "Repay" submit button.

Verify confirm screen:
- Shows the full repayment amount
- Shows "Full Repayment" indicator

Click confirm button.

Screenshot: `04-repay-confirm.png`

### 5. Sign Transaction

Snapshot for "Confirm" button (native wallet EIP-712). Click it.

Screenshot: `05-repay-signing.png`

### 6. Wait for Confirmation

Machine transitions to confirming. Hook polls `cf_loan_accounts` every 6s. For full repayment, confirmation triggers when the loan_id disappears from the loans array.

Poll snapshot every 10s, up to 120s timeout.

Expected: success state.

Screenshots:
- `06-repay-confirming.png`
- `07-repay-confirmed.png`

### 7. Close & Verify

Click "Done". Verify:
- Outstanding debt = $0.00 (or loan row gone)
- Free balance may have decreased by the repayment amount
- Repay button should now be disabled (no loans)
- Voluntary liquidation card should disappear (no active loans)

Screenshot: `08-pool-after-repay.png`

### 8. Report

```
BEFORE: outstanding=D, freeBalance=F, loanCount=N
AFTER:  outstanding=D', freeBalance=F', loanCount=N'
PASS/FAIL: loan fully repaid (D'=0, N'=N-1)
```

## Partial Repayment Variant

To test partial repayment instead:
- Skip the full repayment toggle
- Enter a partial amount (must be >= $10 or $0.10 monkey-patched)
- Confirmation checks principal decrease instead of loan disappearance

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr4/repay/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-repay.png | Pool page with outstanding debt |
| 02 | repay-modal-empty.png | Empty repay modal |
| 03 | repay-full-toggle.png | Full repayment toggled ON |
| 04 | repay-confirm.png | Confirm screen |
| 05 | repay-signing.png | Signing state |
| 06 | repay-confirming.png | Confirming state |
| 07 | repay-confirmed.png | Success |
| 08 | pool-after-repay.png | Pool page, loan cleared |
