# Chainflip Lending: Open Loan (0.1 USDC, monkey-patched minimum)

Tests opening a loan with the monkey-patched $0.10 minimum. Self-sufficient - checks and bootstraps collateral if needed.

**NOTE**: Minimums are monkey-patched to $0.10 in `useChainflipBorrowMinimums.ts` (look for `TODO: rm monkey patch`). Real minimum for new loans is $100.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked with USDC on State Chain (free balance or collateral, at least $0.20 worth)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **borrowMachine.ts**: input -> confirm -> signing -> confirming -> success
- **BorrowInput.tsx**: `availableToBorrowCryptoPrecision` = `(collateral * 0.80 - borrowed) / price`, LTV gauge
- **useBorrowSign.ts**: calls `encodeRequestLoan(cfAsset, amount, null, [])` for new loan
- **useBorrowConfirmation.ts**: snapshots loan count + total principal, polls for increase, 5min timeout
- **Minimums (monkey-patched)**: new loan=$0.10, expand loan=$0.10

## Test Case

### 0. Check Prerequisites

Navigate to USDC pool page. Switch to Borrow tab.

Check "Available to borrow":
- If > 0.1 USDC: skip to Step 2
- If = 0 or < 0.1: need collateral first

If need collateral, check Collateral tab:
- If free balance >= 0.2 USDC: add 0.2 USDC as collateral (Step 1)
- If free balance < 0.2: this fixture cannot proceed - deposit USDC first

Screenshot: `00-prerequisites.png`

### 1. (Conditional) Add Collateral

If needed: open "Add Collateral" modal, enter `0.2`, submit, confirm, sign, wait for confirmation, done.

This gives 0.2 USDC collateral -> available to borrow = 0.2 * 0.80 = 0.16 USDC.

Screenshots:
- `01a-add-collateral.png` (if executed)
- `01b-collateral-success.png` (if executed)

### 2. Open Borrow Modal

Switch to Borrow tab. Click "Borrow" button.

Verify:
- "Available to borrow" shows > 0.1 USDC
- LTV gauge at 0% (no existing loans)

Screenshot: `02-borrow-modal-empty.png`

### 3. Enter Amount (0.1 USDC)

Fill amount with `0.1`.

Verify:
- No minimum warning (monkey-patched to $0.10)
- Fiat equivalent ~$0.10
- LTV gauge shows projected LTV (should be moderate, well under 80%)
- Submit button enabled

Screenshot: `03-borrow-valid-amount.png`

### 4. Submit & Confirm

Click submit. Verify confirm screen shows 0.1 USDC. Click confirm.

Screenshot: `04-borrow-confirm.png`

### 5. Sign Transaction

Snapshot for "Confirm" button (native wallet EIP-712). Click it.

Screenshot: `05-borrow-signing.png`

### 6. Wait for Confirmation

Machine transitions to confirming. Hook snapshots current loans, polls for new loan or principal increase.

Poll snapshot every 10s, up to 120s timeout.

Expected: success state.

Screenshots:
- `06-borrow-confirming.png`
- `07-borrow-confirmed.png`

If on-chain minimum is enforced (protocol rejects $0.10 loan): error state. Screenshot and report failure reason.

### 7. Close & Verify

Click "Done". Verify:
- Borrowed amount shows ~0.1 USDC / ~$0.10
- Repay tab shows outstanding debt
- Voluntary liquidation card appears (loan is now active)

Screenshot: `08-pool-after-borrow.png`

### 8. Report

```
PREREQUISITES: collateral=C (added=C')
BEFORE: borrowed=0, loanCount=0
AFTER:  borrowed=B, loanCount=N
PASS/FAIL: loan opened for 0.1 USDC (or on-chain minimum enforcement failure)
```

## Expected Failure Modes

- **On-chain minimum**: Protocol enforces $100 minimum despite UI monkey patch -> SIGN_ERROR or tx reverts on-chain
- **Insufficient collateral**: available-to-borrow < 0.1 -> need more collateral
- **Nonce conflict**: retry once automatically (nonce retry in eip712.ts)

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr4/borrow-monkey-patch/`:

| # | Filename | State |
|---|----------|-------|
| 00 | prerequisites.png | Checking collateral/borrow availability |
| 01a | add-collateral.png | (conditional) Adding collateral |
| 01b | collateral-success.png | (conditional) Collateral success |
| 02 | borrow-modal-empty.png | Empty borrow modal |
| 03 | borrow-valid-amount.png | Amount 0.1, LTV gauge |
| 04 | borrow-confirm.png | Confirm screen |
| 05 | borrow-signing.png | Signing state |
| 06 | borrow-confirming.png | Confirming state |
| 07 | borrow-confirmed.png | Success (or error) |
| 08 | pool-after-borrow.png | Pool page with loan |
