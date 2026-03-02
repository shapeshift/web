# Chainflip Lending: Minimum Validation

Validates that the view layer enforces the same minimum thresholds defined in xstate machines and hooks.

## Source of Truth

- **Deposit minimum**: `useChainflipMinimumDeposit(assetId)` - chain ingress egress fee, currently 20 USDC
- **Supply minimum**: `useChainflipMinimumSupply(assetId)` - ~100 USD equivalent
- **Withdraw**: `isFullWithdrawalOnly` when `suppliedAmount < minSupply * 2` (no partial withdrawals)
- **Egress**: no minimum (just needs balance + destination)

## Test Pool

USDC pool only. Input 1 USDC max for all tests. Never proceed past the input step.

## Cases

### 1. Deposit (min 20 USDC)

Navigate: `/#/chainflip-lending/balances` > click USDC row > "Deposit to Chainflip" tab > "Deposit" button

Verify:
- Modal shows "Min. Deposit" text with "20 USDC"
- "Open Deposit Channel" button is disabled with empty input
- Input "1" (1 USDC, below 20 min)
- Button remains disabled
- Close modal (Escape)

Source: `DepositInput.tsx` - `isSubmitDisabled` includes `isBelowMinimum` check

### 2. Supply (min ~100 USD)

Navigate: `/#/chainflip-lending/balances` > click USDC row > "Supply" tab

Verify:
- Input "1" (1 USDC, below ~100 USD min)
- Minimum supply warning text appears
- Supply button is disabled

Source: `SupplyInput.tsx` - `isBelowMinimum = amount.gt(0) && amount.lt(minSupply)`

### 3. Withdraw (full-only when supplied < 2x minimum)

Navigate: `/#/chainflip-lending/balances` > click USDC row > "Supply" tab > "Withdraw"

Verify:
- If supplied amount < 2x minimum (~200 USD): no partial input, pre-filled with max
- `isFullWithdrawalOnly` renders a tooltip instead of the numeric input
- Withdraw button should be enabled (full withdrawal)

Source: `WithdrawInput.tsx` - `isFullWithdrawalOnly = availableCryptoPrecision < minSupply * 2`

## Screenshots

Capture to `e2e/screenshots/chainflip-lending-pr3/`:

1. `01-pools-page.png` - Markets/pools overview
2. `02-my-balances.png` - My Balances tab with wallet connected
3. `03-usdc-pool.png` - USDC pool detail page
4. `04-deposit-modal-empty.png` - Deposit modal before input (button disabled)
5. `05-deposit-modal-below-min.png` - Deposit modal with 1 USDC (button disabled, min shown)
6. `06-supply-input-below-min.png` - Supply tab with 1 USDC (warning, button disabled)
7. `07-withdraw-full-only.png` - Withdraw tab showing full-withdrawal-only mode
