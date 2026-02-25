# Chainflip Lending: Open Loan (Borrow USDC)

Tests the complete borrow flow. This fixture is **self-sufficient** - it checks prerequisites and bootstraps them if missing:

1. Check collateral balance >= required amount for target LTV. If not:
2. Check free balance >= needed collateral. If not:
3. Deposit from wallet to free balance (run deposit fixture inline)
4. Add collateral from free balance (run add-collateral flow inline)
5. Open the loan

For a new $100 loan at ~67% LTV (safe margin below 80% target):
- Need ~$150 USDC in collateral
- Need ~$150 USDC in free balance (if no collateral yet)
- Need ~$150 USDC in wallet (if no free balance either)

For a monkey-patched $0.10 loan at ~67% LTV:
- Need ~$0.15 USDC in collateral
- The numbers scale down proportionally

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked with USDC on Ethereum (or sufficient free balance / collateral already on State Chain)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **borrowMachine.ts**: input -> confirm -> signing -> confirming -> success
- **BorrowInput.tsx**: amount input, `availableToBorrowCryptoPrecision` = `(collateral * target_ltv - borrowed) / price`, LTV gauge with projection
- **useBorrowSign.ts**: calls `encodeRequestLoan(cfAsset, amount, null, [])` for new loan, `encodeExpandLoan(loanId, amount, [])` for existing
- **useBorrowConfirmation.ts**: snapshots loan count + total principal, polls `cf_loan_accounts` every 6s for new loan or principal increase, 5min timeout
- **LTV thresholds**: target=80%, topup=85%, soft_liq=90%, hard_liq=95%
- **Minimums**: new loan=$100 (monkey-patched $0.10), expand loan=$10 (monkey-patched $0.10)

## Test Case

### 0. Check Prerequisites (Collateral)

Navigate: `/#/chainflip-lending/balances` > click USDC row to reach pool page

Record from Collateral tab:
- Current collateral amount
- Current free balance

**Decision tree**:
- If collateral > 0 AND `available to borrow` > target loan amount -> skip to Step 3
- If collateral = 0 OR `available to borrow` < target loan amount:
  - Check free balance. If free balance >= needed collateral -> run Add Collateral flow (Step 1)
  - If free balance < needed collateral -> deposit first, then add collateral (Step 1 includes deposit)

Screenshot: `00-prerequisites-check.png`

### 1. (Conditional) Add Collateral

If collateral is insufficient:

Open "Add Collateral" modal. Enter the required amount (e.g. 150 USDC for $100 loan, or 0.2 USDC for $0.10 loan).

Follow the standard add-collateral flow:
- Enter amount -> Submit -> Confirm -> Sign (CONFIRM_STEP for native wallet) -> Wait for confirmation -> Done

Screenshot: `01a-add-collateral-confirm.png` (if executed)
Screenshot: `01b-add-collateral-success.png` (if executed)

### 2. (Conditional) Deposit to Free Balance

If free balance was also insufficient before Step 1:

This step happens BEFORE Step 1. Open deposit modal from "Deposit to Chainflip" tab, deposit enough USDC from wallet. Wait for deposit confirmation. Then proceed with Step 1.

Screenshot: `01-deposit-for-collateral.png` (if executed)

### 3. Open Borrow Modal

Switch to the Borrow tab. Click "Borrow" button.

Verify:
- Modal opens with amount input and USDC symbol
- "Available to borrow" shows a positive amount (based on collateral * 80% LTV - existing borrows)
- LTV gauge shows current LTV (0% if no existing loans)
- Max button visible

Screenshot: `03-borrow-modal-empty.png`

### 4. Test Minimum Validation (new loan)

If no existing loans, fill amount with a tiny value (e.g. `1` for $1, below $100 minimum).

Verify:
- Red minimum warning (e.g. "Minimum loan amount is $100" or $0.10 if monkey-patched)
- Submit button disabled

Screenshot: `04-borrow-below-minimum.png`

### 5. Enter Valid Amount

Clear and fill amount with the target (e.g. `100` USDC for real minimum, or `0.1` for monkey-patched).

Verify:
- No minimum warning
- Fiat equivalent shown
- LTV gauge updates with projected LTV (should be well below 80% target)
- Submit button enabled

Screenshot: `05-borrow-valid-amount.png`

### 6. Submit & Confirm

Click submit. Verify confirm screen:
- Shows borrow amount
- Shows projected LTV

Click "Confirm" / "Borrow" button.

Screenshot: `06-borrow-confirm.png`

### 7. Sign Transaction

Snapshot for "Confirm" button (native wallet EIP-712 signing). Click it.

Screenshot: `07-borrow-signing.png`

### 8. Wait for Confirmation

After signing, machine transitions to confirming. The hook snapshots current loan count + total principal, then polls `cf_loan_accounts` every 6s.

Poll snapshot every 10s, up to 120s timeout.

Expected: success state - a new loan appears in the account.

Screenshots:
- `08-borrow-confirming.png`
- `09-borrow-confirmed.png`

### 9. Close & Verify

Click "Done". Verify on pool page:
- "Borrowed" row in Your Position card shows the loan amount
- Borrow tab shows the borrowed fiat value
- Repay tab shows outstanding debt

Screenshot: `10-pool-after-borrow.png`

### 10. Report

```
PREREQUISITES: collateral=C (added=C'), freeBalance=F (deposited=D')
BEFORE: borrowed=0
AFTER:  borrowed=B
PASS/FAIL: loan opened with amount B, LTV within expected range
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr4/borrow/`:

| # | Filename | State |
|---|----------|-------|
| 00 | prerequisites-check.png | Pool page, checking collateral/free balance |
| 01 | deposit-for-collateral.png | (conditional) Deposit flow |
| 01a | add-collateral-confirm.png | (conditional) Add collateral confirm |
| 01b | add-collateral-success.png | (conditional) Add collateral success |
| 03 | borrow-modal-empty.png | Empty borrow modal |
| 04 | borrow-below-minimum.png | Below minimum warning |
| 05 | borrow-valid-amount.png | Valid amount with LTV gauge |
| 06 | borrow-confirm.png | Confirm screen |
| 07 | borrow-signing.png | Signing state |
| 08 | borrow-confirming.png | Confirming state |
| 09 | borrow-confirmed.png | Success |
| 10 | pool-after-borrow.png | Pool page with loan |
