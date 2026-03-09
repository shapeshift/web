# Chainflip Lending - Supply & Withdraw (Product Overview)

This document covers the supply side of Chainflip lending: supplying assets to lending pools to earn interest, and withdrawing them back.

## Prerequisites

Before supply operations, the user must have:
1. A funded and registered State Chain account (see deposit overview)
2. Assets in their **free balance** (deposited via the deposit flow)

## Core Concepts

### What Supplying Means

When you supply assets to a Chainflip lending pool, your funds move from your **free balance** to a **supply position** in that pool. Borrowers pay interest on what they borrow, and that interest accrues to suppliers proportionally.

```
                     +---[add_lender_funds]---+
                     |                        |
              +------+-------+         +------+------+
              | Free Balance |         | Supply      |
              | (idle)       |         | Position    |
              +--------------+         | (earning)   |
                     ^                 +------+------+
                     |                        |
                     +--[remove_lender_funds]--+
```

Supply positions are **per asset, per pool**. You can supply to multiple pools simultaneously (e.g., supply USDC to the USDC pool and ETH to the ETH pool).

### Interest Mechanics

Interest follows a kinked utilization curve:

```
Interest Rate
     |
 25% |                                          /
     |                                         /
     |                                        /
  4% |                               --------/  (kink at 95% util)
     |                        ------/
     |                 ------/
     |          ------/
  0% |--------/
     +--------+--------+--------+--------+----
     0%      25%      50%      75%     100%  Utilization
```

- 0% utilization: 0% interest
- 95% utilization (kink): 4% interest
- 100% utilization: 25% interest

Interest is collected every 10 blocks (~60 seconds) and paid from borrower debt to the lending pool. As a supplier, your share of interest grows proportionally to your supply position.

## Supply Flow

### What It Does

Moves assets from the user's State Chain free balance into a lending pool supply position.

### xstate Machine: `supplyMachine`

```
+-------+     SUBMIT       +---------+    CONFIRM    +---------+
| input | ----------------> | confirm | ------------> | signing |
+-------+  (amount crypto   +---------+               +----+----+
   ^        precision +                                     |
   |        base unit)                                SIGN_SUCCESS
   |                                                        |
   |                                                        v
   |              DONE                               +------+------+
   +<------------ success <------------------------- | confirming  |
                                                     +-------------+
```

### Context

- `supplyAmountCryptoPrecision` / `supplyAmountCryptoBaseUnit` - how much to supply
- `freeBalanceCryptoBaseUnit` - max available, synced in real-time via `SYNC_FREE_BALANCE`
- `initialLendingPositionCryptoBaseUnit` - snapshot of lending position at confirm time, used to detect when supply is credited
- `lastUsedNonce` - for sequential operations

### Protocol Call

SCALE-encoded `lendingPools.addLenderFunds(asset, amount)` -> EIP-712 sign -> submit.

### Confirmation

The app polls `cf_lending_pool_supply_balances` at ~6 second intervals. Once the user's supply position increases by the supplied amount (compared to `initialLendingPositionCryptoBaseUnit`), the operation is confirmed.

### Minimums

- Minimum supply: $100 USD

## Withdraw Flow

### What It Does

Moves assets from a lending pool supply position back to the user's State Chain free balance.

### xstate Machine: `withdrawMachine`

```
+-------+     SUBMIT       +---------+    CONFIRM    +---------+
| input | ----------------> | confirm | ------------> | signing |
+-------+  (amount,         +---------+               +----+----+
   ^        isFullWithdraw)                                 |
   |                                                  SIGN_SUCCESS
   |                                                        |
   |                                                        v
   |              DONE                               +------+------+
   +<------------ success <------------------------- | confirming  |
                                                     +-------------+
```

### Context

- `withdrawAmountCryptoPrecision` / `withdrawAmountCryptoBaseUnit`
- `supplyPositionCryptoBaseUnit` - current supply position, synced via `SYNC_SUPPLY_POSITION`
- `isFullWithdrawal` - flag for withdrawing the entire position (passes `null` amount to the protocol, which withdraws everything)

### Protocol Call

SCALE-encoded `lendingPools.removeLenderFunds(asset, amount)` -> EIP-712 sign -> submit.

When `isFullWithdrawal` is true, `amount` is encoded as `null` (SCALE `Option::None`), telling the protocol to remove the entire supply position. This avoids dust from rounding.

### Withdrawal to On-Chain Wallet

After withdrawing from the lending pool, funds land in the **free balance**. To get them back to an on-chain wallet, the user needs to use the **Egress** flow (see below). This can be presented as an optional checkbox or CTA after the withdraw completes.

## Egress Flow (Withdraw from State Chain)

### What It Does

Takes assets from the user's State Chain free balance and sends them to an on-chain wallet address on any supported chain.

### xstate Machine: `egressMachine`

```
+-------+     SUBMIT       +---------+    CONFIRM    +---------+
| input | ----------------> | confirm | ------------> | signing |
+-------+  (amount,         +---------+  (captures    +----+----+
   ^        destination      initial free              |
   |        address)         balance)             SIGN_SUCCESS
   |                                                   |
   |                                                   v
   |              DONE                          +------+------+
   +<------------ success <-------------------- | confirming  |
                                                +------+------+
                                                       |
                                                 EGRESS_CONFIRMED
                                                 (+ optional
                                                  egressTxRef)
```

### Context

- `egressAmountCryptoPrecision` / `egressAmountCryptoBaseUnit`
- `destinationAddress` - target address on the external chain
- `freeBalanceCryptoBaseUnit` - max available, synced via `SYNC_FREE_BALANCE`
- `initialFreeBalanceCryptoBaseUnit` - captured at confirm time for change detection
- `egressTxRef` - optional reference to the on-chain egress transaction

### Protocol Call

SCALE-encoded `liquidityProvider.withdrawAsset(amount, asset, destinationAddress)` -> EIP-712 sign -> submit.

Note: `withdrawAsset` takes an explicit `destinationAddress` - it does NOT use the stored refund address. This means the user can egress to any valid address on the target chain.

### Confirmation

The app polls `cf_free_balances` and detects when the balance decreases from the initial snapshot. The egress is confirmed when Chainflip broadcasts the on-chain transaction.

## Withdraw Supply + Egress Combined

A common user flow is "I want my money back in my wallet". This involves two steps:

1. **Withdraw from pool**: `removeLenderFunds` (supply position -> free balance)
2. **Egress to wallet**: `withdrawAsset` (free balance -> on-chain)

These can be batched via `Environment.batch` for a single EIP-712 signature:

```
User clicks "Withdraw to Wallet"
  -> batch([removeLenderFunds(asset, amount), withdrawAsset(amount, asset, address)])
  -> single EIP-712 signature
  -> funds go from supply position directly to on-chain wallet
```

The UI can offer this as an optional checkbox: "Also withdraw to wallet" during the supply withdraw flow.

## Live Pool Data (March 2026)

| Pool | Total Supplied | Available | Borrowed | Utilization | APY |
|------|---------------|-----------|----------|-------------|-----|
| USDC | ~$120,393 | ~$39,228 | ~$81,165 | 67.44% | 2.84% |
| USDT | ~$408,784 | ~$279,528 | ~$129,256 | 31.67% | 1.33% |
| BTC | ~0.179 BTC | ~0.179 BTC | 0 | 0% | 0% |
| ETH | ~0.030 ETH | ~0.030 ETH | 0 | 0% | 0% |
| SOL | ~0.816 SOL | ~0.816 SOL | 0 | 0% | 0% |

### Supported Supply Assets

All lending pools accept the following assets for supply (from `cf_safe_mode_statuses`):

- Ethereum: ETH, FLIP, USDC, USDT
- Bitcoin: BTC
- Polkadot: DOT
- Arbitrum: ETH, USDC
- Solana: SOL, USDC
- Assethub: DOT, USDT, USDC

## Common Machine Patterns

All supply/withdraw/egress machines share consistent patterns:

| Pattern | Description |
|---------|-------------|
| `SYNC_*` events | Root-level handlers for real-time data updates from any state |
| `CONFIRM_STEP` | Manual confirmation gate for native wallet users |
| `executing` tag | Applied to signing + confirming states for UI spinners |
| `RETRY` from error | Routes back to exact failed step (signing or confirming) |
| `BACK` | Returns to input, clears errors |
| `DONE` | Resets machine for a new operation |
| `lastUsedNonce` | Tracks nonce for sequential EIP-712 calls |

## Notes

- Supplying does NOT require a refund address (only borrowing and deposit channels do).
- Withdrawal from a supply pool may fail if the pool doesn't have enough available liquidity (i.e., too much is borrowed). The user would need to wait for borrowers to repay or for the utilization rate to drop.
- Interest earned is automatically compounded into the supply position - there's no separate "claim interest" step.
- All rate fields (`utilisation_rate`, `current_interest_rate`) are Permill (1,000,000 = 100%). The app converts these using `permillToDecimal()` for display.
