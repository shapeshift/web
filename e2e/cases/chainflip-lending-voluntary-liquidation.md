# Chainflip Lending: Voluntary Liquidation (Initiate + Stop)

Tests both initiating and stopping voluntary liquidation. Voluntary liquidation is an emergency exit that allows the protocol to liquidate your position at a reduced penalty. Requires an active loan.

## Prerequisites

- agent-browser session `native` already running (headed, with profile)
- Wallet unlocked with an active loan (run borrow fixture first)
- Server on `localhost:3001`
- `$NATIVE_WALLET_PASSWORD` env var set

## Source of Truth

- **voluntaryLiquidationMachine.ts**: confirm -> signing -> confirming -> success (no input step)
- **VoluntaryLiquidationConfirm.tsx**: danger-styled confirmation, shows position summary
- **useVoluntaryLiquidationSign.ts**: calls `encodeInitiateVoluntaryLiquidation()` or `encodeStopVoluntaryLiquidation()`
- **useVoluntaryLiquidationConfirmation.ts**: polls `cf_loan_accounts` every 6s, checks `liquidation_status.liquidation_type === 'Voluntary'` for initiate, or null status for stop, 5min timeout
- Voluntary liquidation card only appears when `hasLoans && accountId` (Pool.tsx:826)

## Part 1: Initiate Voluntary Liquidation

### 1. Record Before State

Navigate to USDC pool page. Verify:
- Active loan exists (Borrowed > $0 in Your Position card)
- Voluntary liquidation card visible at bottom of action column
- Button text is "Liquidate Position" (red outline style)

Screenshot: `01-pool-before-initiate.png`

### 2. Click Initiate

Click the "Liquidate Position" button.

Verify:
- Modal opens with danger-styled confirmation
- Warning text explains consequences of voluntary liquidation
- "Confirm" button visible (danger/red colored)
- "Back" button visible

Screenshot: `02-initiate-confirm.png`

### 3. Confirm & Sign

Click "Confirm".

Modal transitions to signing state. Snapshot for "Confirm" button (native wallet EIP-712). Click it.

Screenshot: `03-initiate-signing.png`

### 4. Wait for Confirmation

Polls `cf_loan_accounts` every 6s for `liquidation_status` to change to `{ liquidation_type: "Voluntary" }`.

Poll snapshot every 10s, up to 120s timeout.

Expected: success state.

Screenshots:
- `04-initiate-confirming.png`
- `05-initiate-confirmed.png`

### 5. Close & Verify Initiate

Click "Done". Verify on pool page:
- Voluntary liquidation card now has red border
- "Voluntary liquidation in progress" text visible
- Button text changed to "Stop Liquidation" (yellow/solid style)

Screenshot: `06-pool-after-initiate.png`

## Part 2: Stop Voluntary Liquidation

### 6. Click Stop

Click the "Stop Liquidation" button.

Verify:
- Modal opens with confirmation (different messaging for stop)

Screenshot: `07-stop-confirm.png`

### 7. Confirm & Sign Stop

Click "Confirm". Snapshot for "Confirm" button, click it.

Screenshot: `08-stop-signing.png`

### 8. Wait for Stop Confirmation

Polls for `liquidation_status` to become null (no longer voluntary).

Poll snapshot every 10s, up to 120s timeout.

Screenshots:
- `09-stop-confirming.png`
- `10-stop-confirmed.png`

### 9. Close & Verify Stop

Click "Done". Verify:
- Voluntary liquidation card back to normal (no red border)
- "In progress" text gone
- Button text back to "Liquidate Position"

Screenshot: `11-pool-after-stop.png`

### 10. Report

```
PART 1 (Initiate):
  BEFORE: liquidation_status=null
  AFTER: liquidation_status=Voluntary
  PASS/FAIL

PART 2 (Stop):
  BEFORE: liquidation_status=Voluntary
  AFTER: liquidation_status=null
  PASS/FAIL
```

## Screenshots

All screenshots to `e2e/screenshots/chainflip-lending-pr4/voluntary-liquidation/`:

| # | Filename | State |
|---|----------|-------|
| 01 | pool-before-initiate.png | Pool page, loan active, no liquidation |
| 02 | initiate-confirm.png | Initiate confirmation modal |
| 03 | initiate-signing.png | Signing initiate |
| 04 | initiate-confirming.png | Confirming initiate |
| 05 | initiate-confirmed.png | Initiate success |
| 06 | pool-after-initiate.png | Pool page with active liquidation |
| 07 | stop-confirm.png | Stop confirmation modal |
| 08 | stop-signing.png | Signing stop |
| 09 | stop-confirming.png | Confirming stop |
| 10 | stop-confirmed.png | Stop success |
| 11 | pool-after-stop.png | Pool page, liquidation cleared |
