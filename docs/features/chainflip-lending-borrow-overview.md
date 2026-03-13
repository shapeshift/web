# Chainflip Lending - Borrow, Collateral & Repay (Product Overview)

This document covers the loan lifecycle in Chainflip lending: borrowing against collateral, managing collateral positions, repaying loans, and voluntary liquidation.

## Prerequisites

Before any borrow/collateral operations, the user must have:
1. A funded and registered State Chain account (see deposit overview)
2. Assets in their **free balance** (deposited via the deposit flow)
3. A refund address set for relevant chains

## Core Concepts

### Collateral and Loans

Chainflip lending uses an **overcollateralized** model. To borrow, you must first move assets from your free balance into collateral, then request a loan against that collateral.

```
Free Balance ----[add_collateral]----> Collateral
                                          |
                                    [request_loan]
                                          |
                                          v
                                    Loan Created
                                    (borrowed funds
                                     land in free balance)
```

The collateral backs ALL your loans as a single blended position. There's one LTV ratio per account, not per loan.

### LTV (Loan-to-Value) Ratio

LTV = total debt / total collateral value (in USD, via Chainflip oracles).

| Threshold | LTV | What Happens |
|-----------|-----|-------------|
| Target | 80% | Maximum LTV at loan creation |
| Topup | 85% | Collateral topup starts getting suggested |
| Soft Liquidation Abort | 88% | Soft liquidation stops if LTV drops below |
| Soft Liquidation | 90% | Protocol starts selling collateral in $10k chunks (0.5% max slippage) |
| Hard Liquidation Abort | 93% | Hard liquidation stops if LTV drops below |
| Hard Liquidation | 95% | Protocol sells collateral in $50k chunks (5% max slippage) |
| Low LTV | 50% | Below this, reduced fees apply |

Liquidations are "friendly" - the protocol sells collateral in chunks to bring LTV back to a safe level, rather than liquidating the entire position. This is a key differentiator from THORChain lending.

### Oracle Prices

All LTV calculations use Chainflip's on-chain oracle prices, updated by validators. Current price status from `cf_oracle_prices`:

| Asset | Status |
|-------|--------|
| BTC/USD | UpToDate |
| ETH/USD | UpToDate |
| SOL/USD | UpToDate |
| USDC/USD | UpToDate |
| USDT/USD | UpToDate |

## Borrow Flow

### What It Does

Takes an amount to borrow from a lending pool, optionally adding extra collateral in the same transaction. The borrowed funds land in the user's free balance.

### xstate Machine: `borrowMachine`

```
+-------+     SUBMIT     +---------+    CONFIRM    +---------+
| input | ------------->  | confirm | ------------> | signing |
+-------+     (amount,    +---------+               +----+----+
   ^          collateral                                  |
   |          topup asset,                          SIGN_SUCCESS
   |          extra                                       |
   |          collateral,                                 v
   |          projected                            +------+------+
   |          LTV)                                 | confirming  |
   |                                               +------+------+
   |                                                      |
   |              DONE                              BORROW_CONFIRMED
   +<------------ success <-------------------------------+
```

### Context

- `borrowAmountCryptoPrecision` / `borrowAmountCryptoBaseUnit` - how much to borrow
- `collateralTopupAssetId` - optional asset to auto-topup collateral from free balance
- `extraCollateral[]` - array of `{ assetId, amountCryptoBaseUnit }` for additional collateral
- `currentLtvBps` / `projectedLtvBps` - current and projected LTV after borrow
- Real-time LTV sync via `SYNC_LTV` event

### Protocol Call

SCALE-encoded `lendingPools.requestLoan(loanAsset, loanAmount, collateralTopupAsset, extraCollateral[])` -> EIP-712 sign -> submit. If extra collateral is provided, the protocol atomically adds collateral and creates the loan.

### Minimums

- Minimum loan creation: $100 USD
- Minimum loan update (expand): $10 USD

## Collateral Flow (Add/Remove)

### What It Does

Moves assets between free balance and collateral. Two modes: `add` (free balance -> collateral) and `remove` (collateral -> free balance).

### xstate Machine: `collateralMachine`

```
+-------+     SUBMIT     +---------+    CONFIRM    +---------+
| input | ------------->  | confirm | ------------> | signing |
+-------+     (amount,    +---------+               +----+----+
   ^          mode)                                       |
   |                                                SIGN_SUCCESS
   |                                                      |
   |                                                      v
   |              DONE                             +------+------+
   +<------------ success <----------------------- | confirming  |
                                                   +-------------+
```

### Context

- `mode`: `'add'` or `'remove'`
- `collateralAmountCryptoPrecision` / `collateralAmountCryptoBaseUnit`
- `freeBalanceCryptoBaseUnit` - for add mode max (synced via `SYNC_FREE_BALANCE`)
- `collateralBalanceCryptoBaseUnit` - for remove mode max (synced via `SYNC_COLLATERAL_BALANCE`)

### Protocol Calls

- **Add**: `lendingPools.addCollateral(collateralTopupAsset, collateral[])` - array of `{ chain, asset, amount }`
- **Remove**: `lendingPools.removeCollateral(collateral[])` - can only remove if resulting LTV stays below target (80%)

### Minimums

- Minimum collateral update: $10 USD

## Repay Flow

### What It Does

Repays principal on an existing loan using funds from the free balance. Supports partial and full repayment.

### xstate Machine: `repayMachine`

```
+-------+     SUBMIT     +---------+    CONFIRM    +---------+
| input | ------------->  | confirm | ------------> | signing |
+-------+     (amount,    +---------+               +----+----+
   ^          loanId,                                     |
   |          isFull                                SIGN_SUCCESS
   |          Repayment)                                  |
   |                                                      v
   |              DONE                             +------+------+
   +<------------ success <----------------------- | confirming  |
                                                   +-------------+
```

### Context

- `loanId` - which loan to repay
- `repayAmountCryptoPrecision` / `repayAmountCryptoBaseUnit`
- `isFullRepayment` - whether to repay the full outstanding debt
- `freeBalanceCryptoBaseUnit` - max available (synced via `SYNC_FREE_BALANCE`)
- `outstandingDebtCryptoBaseUnit` - remaining debt (synced via `SYNC_DEBT`)

### Protocol Call

`lendingPools.makeRepayment(loanId, amount)` where amount is either a specific value or `'full'` for complete repayment.

### Full Unwind Pattern

To fully exit a borrow position:
1. Repay loan (free balance -> debt reduction)
2. Remove collateral (collateral -> free balance)
3. Egress (free balance -> on-chain wallet)

These can potentially be batched via `Environment.batch` (max 10 calls per batch) for a single-signature experience.

## Voluntary Liquidation Flow

### What It Does

Allows the user to voluntarily initiate (or stop) a liquidation of their position. This is useful when you want the protocol to unwind your position for you, selling collateral to repay debt.

### xstate Machine: `voluntaryLiquidationMachine`

```
+---------+    CONFIRM    +---------+   SIGN_SUCCESS   +------------+
| confirm | ------------> | signing | ----------------> | confirming |
+---------+               +---------+                   +-----+------+
     |                                                        |
     | BACK                                        LIQUIDATION_CONFIRMED
     v                                                        |
+-----------+         DONE                                    v
| cancelled | <------------- success <------------------------+
+-----------+
  (final)
```

Note: this machine starts at `confirm` (no input step) and ends at `cancelled` (final state). The `action` context determines whether we're initiating or stopping voluntary liquidation.

### Protocol Calls

- **Initiate**: `lendingPools.initiateVoluntaryLiquidation()` - protocol starts unwinding
- **Stop**: `lendingPools.stopVoluntaryLiquidation()` - cancel the voluntary liquidation

## Interest and Fees

### Interest Rates (live from `cf_lending_pools`)

Interest follows a kinked curve: 0% at 0% utilization, 4% at 95% utilization (kink), 25% at 100% utilization.

| Pool | Total Supplied | Available | Utilization | Interest Rate | Origination Fee |
|------|---------------|-----------|-------------|---------------|-----------------|
| USDC | ~$120,393 | ~$39,228 | 67.44% | 2.84% | 1 bp |
| USDT | ~$408,784 | ~$279,528 | 31.67% | 1.33% | 1 bp |
| BTC | ~0.179 BTC | ~0.179 BTC | 0% | 0% | 5 bp |
| ETH | ~0.030 ETH | ~0.030 ETH | 0% | 0% | 1 bp |
| SOL | ~0.816 SOL | ~0.816 SOL | 0% | 0% | 1 bp |

Interest is collected every 10 blocks (~60 seconds).

### Fee Structure

- **Origination fee**: 5 bps for BTC, 1 bp for all others (charged on loan creation)
- **Liquidation fee**: 5 bps (20% goes to protocol, 80% to liquidators)
- **Interest**: Variable based on utilization curve (see above)

## Live Account Example

Current state of the test account showing an active borrow position:

```
Collateral:
  USDC: ~156.43

Loans:
  #126: USDC, principal ~101.07, created at block 11,941,970

Blended LTV: ~64.65% (well below 80% target)
Liquidation Status: None
Collateral Topup Asset: Not set
```

## Safe Mode Status (live)

All lending operations are currently enabled:
- Borrowing: enabled (all assets)
- Add lender funds: enabled
- Withdraw lender funds: enabled
- Add collateral: enabled
- Remove collateral: enabled
- Liquidations: enabled

## Composable Operations via Batching (not yet in UI)

The low-level `encodeBatch` primitive exists in `src/lib/chainflip/scale.ts` and is tested, but the UI state machines currently sign each operation individually. The following batch combinations are **planned/aspirational** and not yet wired into the UI components or xstate machines:

| Batch | Use Case |
|-------|----------|
| `addCollateral + requestLoan` | First borrow (add collateral and borrow in one sign) |
| `makeRepayment + removeCollateral` | Partial unwind |
| `makeRepayment + removeCollateral + withdrawAsset` | Full unwind to on-chain wallet |
| `registerRefundAddress + addCollateral + requestLoan` | First-time borrow with setup |

Current implementation: each operation gets its own EIP-712 signature, with nonces incremented manually (`lastUsedNonce + 1`) for sequential calls within the same session. Batching would reduce these to a single signature per composed operation.
