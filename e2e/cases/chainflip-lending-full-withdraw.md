# Chainflip Lending: Full USDC Withdraw (State Chain only)

Tests the complete withdraw flow via xstate machine - signing, confirming, and balance invalidation.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked, USDC supplied to lending pool
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **withdrawMachine.ts**: signing -> confirming -> done, with batch fallback
- **WithdrawInput.tsx**: `isFullWithdrawalOnly` when `suppliedAmount < minSupply * 2`
- Full withdrawal does NOT check "Also withdraw to wallet" - funds go to State Chain free balance only

## Test Case

### 1. Record Before State

Navigate: `/#/chainflip-lending/balances` > My Balances tab

Record from USDC row:
- Wallet balance (e.g. 2.06 USDC)
- State Chain free balance (e.g. 20.34 USDC)
- Supplied amount (e.g. 100.50 USDC)

### 2. Initiate Withdraw

Navigate: Click USDC row > "Supply" tab > "Withdraw" button

Verify:
- No numeric input field (full-withdrawal-only mode)
- Amount pre-filled with full supplied balance
- "Also withdraw to wallet" checkbox is UNCHECKED
- "Withdraw" action button is enabled

Screenshot: `08-withdraw-before-sign.png`

### 3. Sign Transaction

Click "Withdraw" action button.

The xstate modal transitions to signing state. A confirm screen will appear showing the transaction details. Snapshot to find the "Confirm" button ref and click it. If a password prompt appears instead, fill `$NATIVE_WALLET_PASSWORD` and click Next/Confirm.

The native wallet uses EIP-712 signing which shows a confirm dialog - you MUST click the "Confirm" button to proceed. Do not wait for it to auto-advance.

Screenshot: `09-withdraw-signing.png`

### 4. Wait for Confirmation

After signing, the machine transitions to confirming state. Poll snapshot every 10s.

Timeout: 120 seconds.

Expected: confirmation/success state with checkmark or success text.

Screenshots:
- `10-withdraw-confirming.png` (intermediate state)
- `11-withdraw-confirmed.png` (final success)

If timeout: screenshot as `11-withdraw-timeout.png`, report last state.

### 5. Close Modal & Verify Balance Invalidation

Click "Done" to close the success modal. The pool page behind it should already show updated values (query invalidation fires on confirmation). Do NOT navigate away - just verify the values on the pool page that's already visible:

- Free balance increased by ~supplied amount (before_free + before_supplied ~ after_free)
- Supplied is 0 or near-zero
- Withdraw button should be disabled (no position)

Screenshot: `12-balances-after-withdraw.png`

### 7. Report

Print PASS/FAIL with before/after values:

```
BEFORE: wallet=X, free=Y, supplied=Z
AFTER:  wallet=X, free=Y', supplied=Z'
PASS/FAIL: free increased by ~Z, supplied is ~0
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr3/`:

| # | Filename | State |
|---|----------|-------|
| 08 | withdraw-before-sign.png | Withdraw input, full-only, pre-filled |
| 09 | withdraw-signing.png | xstate signing state |
| 10 | withdraw-confirming.png | xstate confirming state |
| 11 | withdraw-confirmed.png | Success (or timeout) |
| 12 | balances-after-withdraw.png | Balances with updated free/supplied |
