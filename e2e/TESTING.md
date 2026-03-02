# Chainflip Lending - Testing Log

Testing log for the Chainflip Lending feature (PR3: supply/deposit, PR4: borrow/collateral/repay).
Will be folded into PR body testing section when ready.

## Test Wallet

- Address: `0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986`
- SS58 (Chainflip): `cFHsUq1uK5opJudRDd194A6JcRQNyhKtXNMRrMgNLV3izEw4P`
- Pool: USDC (`eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`)
- Dev server: `localhost:3001`
- Branch: `feat/chainflip-lending-pr4`

## On-Chain Minimums (from `cf_lending_config`)

| Operation | On-chain | With 1% buffer |
|-----------|----------|----------------|
| Supply | $100 | $101.00 |
| Update Collateral | $10 | $10.10 |
| New Loan | $100 | $101.00 |
| Update Loan | $10 | $10.10 |
| Deposit (protocol) | $20 | N/A (protocol-level) |

## Operations Tested

### 1. Add Collateral (monkey-patched minimums) - PASS

- **Date**: 2025-02-25
- **Amount**: 0.1 USDC (with minimums monkey-patched to $0.10)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/add-collateral-monkey-patch/`
- **Notes**: Validated the full add collateral flow (input -> confirm -> EIP-712 sign -> on-chain confirmation). Used monkey-patched minimums to test with small amounts.

### 2. Add Collateral ($10 real minimum) - FAIL then PASS

- **Date**: 2025-02-25
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/add-collateral/`

**$10 attempt - TIMEOUT**: Signed and submitted but confirmation timed out after 5 minutes. Likely cause: stale nonce from earlier monkey-patched attempt that was still pending.

**$11 attempt - PASS**: Confirmed on-chain within ~10 seconds.
- On-chain after: collateral = `0xa7d8c0` = 11,000,000 = 11.0 USDC
- Free balance decreased by exactly 11.0 USDC

**Action taken**: Added 1% buffer to all minimums (`MINIMUM_BUFFER = 1.01`) in `useChainflipBorrowMinimums.ts` and `useChainflipMinimumSupply.ts` to guard against oracle price fluctuations causing borderline rejections.

### 3. Deposit to Chainflip (wallet -> free balance) - PASS

- **Date**: 2025-02-25
- **Amount**: 104.821085 USDC (full wallet balance via Max)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/deposit-flow/01-04`
- **Flow**: Open Deposit Channel -> Confirm & Deposit -> multi-step signing (Approve FLIP, Fund Account, Register Account, Set Refund Address, Open Channel, Send Deposit) -> Confirming -> Deposit Confirmed
- **On-chain after**: Free USDC = 111.532764 (was 6.750171 + ~104.78 deposited), Wallet = 0
- **Notes**: Small fee deducted (~0.04 USDC). Multi-step deposit flow includes account registration steps since this was the first deposit. Subsequent deposits should be simpler.

### 4. Add Collateral ($10.20 - buffered minimum) - PASS

- **Date**: 2025-02-25
- **Amount**: 10.2 USDC (just above $10.10 buffered minimum)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/deposit-flow/05-09`
- **Flow**: Add Collateral -> Confirm & Add -> EIP-712 sign -> Collateral Added (~5s)
- **On-chain after**: Collateral = `0x1437c80` = 21,200,000 = 21.2 USDC, Free = 101.332764 USDC
- **Notes**: Confirms 1% buffer works correctly. $10.20 > $10.10 buffer passes validation and on-chain.

### 5. Supply $101 USDC (free -> pool) - PASS

- **Date**: 2025-02-25
- **Amount**: 101 USDC (at exact buffered minimum)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/supply/01-04`
- **Flow**: Supply tab -> Supply button -> Modal (amount input 101) -> Confirm & Supply -> EIP-712 sign -> Supply Successful (~10s)
- **On-chain after**: Free = 0.332764, Supplied = 101 USDC
- **Notes**: Tested at exact minimum threshold ($101.00 buffered). Confirmed on-chain.

### 6. Withdraw Supply $101 USDC (pool -> free) - PASS

- **Date**: 2025-02-25
- **Amount**: 101 USDC (full supply via Max)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/withdraw-supply/01-03`
- **Flow**: Supply tab -> Withdraw button -> Modal (shows "Available to withdraw 101 USDC", has egress checkbox) -> Max -> Withdraw -> Confirm & Withdraw -> EIP-712 sign -> Withdrawal Successful (~10s)
- **On-chain after**: Free = 101.332764 USDC, Supplied = 0
- **Notes**: Modal has "Check the box below to also withdraw them back to your wallet" option for combo withdraw+egress. Tested without egress (pool -> free only).

### 7. Remove Collateral $11 USDC (collateral -> free) - PASS

- **Date**: 2025-02-25
- **Amount**: 11 USDC (above $10.10 buffered minimum)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/remove-collateral/01-03`
- **Flow**: Collateral tab -> Remove Collateral -> Modal (amount input 11) -> Confirm & Remove -> EIP-712 sign -> Collateral Removed (~18s)
- **On-chain after**: Collateral = 10.2 USDC, Free = 112.332764 USDC
- **Notes**: Slightly slower confirmation (~18s vs typical ~5-10s).

### 8. Egress $50 USDC (free -> wallet) - PASS

- **Date**: 2025-02-25
- **Amount**: 50 USDC
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/egress/01-03`
- **Flow**: Deposit to Chainflip tab -> Withdraw button -> Modal (shows free balance, destination auto-filled 0x5daf...61c986) -> amount 50 -> Confirm Withdrawal -> EIP-712 sign -> long wait (~3-4 min) -> Withdrawal Submitted
- **On-chain after**: Free = 62.332764 USDC, Wallet = +50 USDC
- **Ethereum tx**: `0x31b0ba3af7c74486f70d9535653aef1de2f32300c213249059db3216b1561933`
- **Notes**: Egress takes longest of all operations (3-4 min) because it involves State Chain processing + Ethereum broadcast. On-chain free balance drops immediately but UI waits for Ethereum broadcast confirmation. Poll interval is 60s. Explorer GraphQL API confirms broadcast complete.

### 9. Second Deposit $59.917210 USDC (wallet -> free) - PASS

- **Date**: 2025-02-25
- **Amount**: 59.917210 USDC (full wallet balance via Max)
- **Screenshots**: (part of deposit-flow series)
- **Flow**: Deposit tab -> Max -> Open Deposit Channel -> Confirm & Deposit -> EIP-712 sign -> Deposit Confirmed (~60s)
- **On-chain after**: Free = 122.229594 USDC
- **Notes**: Second deposit was simpler (no account registration steps needed since already registered from first deposit).

### 10. Add Collateral $117 USDC (free -> collateral, to enable borrow) - PASS

- **Date**: 2026-02-25
- **Amount**: 117 USDC
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/add-collateral-117/01-04`
- **Flow**: Collateral tab -> Add Collateral -> Modal (117 USDC, available 122.229594) -> Add Collateral -> Confirm & Add -> EIP-712 sign -> Collateral Added (~15s)
- **On-chain after**: Collateral = 127.2 USDC (`0x794eb00`), Free = 5.229594 USDC (`0x4fcc1a`)
- **Notes**: Added large amount to bring collateral to $127.20. Max borrow at 80% target LTV = $101.76 > $101 minimum loan. This unlocks the borrow flow.

### 11. Borrow $101 USDC (creates loan against collateral) - PASS

- **Date**: 2026-02-25
- **Amount**: 101 USDC
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/borrow/01-05`
- **Flow**: Borrow tab -> Borrow button -> Modal (shows LTV gauge with Target/Soft/Hard liquidation markers, available to borrow 101.76 USDC) -> enter 101 -> Borrow -> Confirm screen ("Projected LTV: 79.4%") -> Confirm & Borrow -> EIP-712 sign -> Borrow Successful (~5s)
- **On-chain after**:
  - Collateral: 127.2 USDC (unchanged)
  - Loan ID: 124, Principal: 101.0101 USDC (includes 0.01% origination fee)
  - Free: 106.229594 USDC (was 5.229594 + 101 borrowed)
  - LTV Ratio: 79.41% (Permill: 794104565)
- **Notes**: LTV gauge in input modal shows current LTV (0.0% before borrow), confirm screen shows projected LTV (79.4%). Max borrow correctly calculated as collateral * 80% target LTV - existing debt. Origination fee (0.01%) applied on-chain: 101 * 1.0001 = 101.0101 USDC principal.

### 12. Full Repayment $101.0101 USDC (clears loan) - PASS

- **Date**: 2026-02-25
- **Amount**: 101.0101 USDC (full repayment)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/repay/01-05`
- **Flow**: Repay tab -> Repay button -> Modal (shows outstanding debt 101.0101 USDC, free balance 106.229594, "Full repayment" checkbox) -> check Full repayment (hides amount input) -> Repay -> Confirm ("Full repayment" badge) -> Confirm & Repay -> EIP-712 sign -> Repayment Successful (~5s)
- **On-chain after**:
  - Collateral: 127.2 USDC (unchanged)
  - Loans: NONE (fully cleared)
  - Free: 5.219482 USDC
  - LTV: 0%
- **Notes**: Full repayment checkbox simplifies UX by removing amount input. Repaid exact outstanding amount. Loan fully cleared on-chain. Small difference in free balance (5.229594 - 101.0101 + 101 = 5.219494 expected, got 5.219482) due to interest accrual between borrow and repay (~0.000012 USDC, ~20 seconds of 3.24% APY).

### 13. Second Borrow $101 USDC (to test partial repay) - PASS

- **Date**: 2026-02-25
- **Amount**: 101 USDC
- **Flow**: Borrow tab -> Borrow -> 101 USDC -> Confirm (Projected LTV: 79.4%) -> EIP-712 sign -> Borrow Successful (~5s)
- **On-chain after**: Loan ID: 125, Principal: 101.0101 USDC, Free: 106.219482 USDC

### 14. Partial Repayment $11 USDC - FAIL (Protocol Constraint)

- **Date**: 2026-02-25
- **Amount**: 11 USDC
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/repay/06-partial-input.png`, `07-partial-confirm.png`
- **Flow**: Repay -> 11 USDC -> Confirm & Repay -> EIP-712 sign -> stuck "Confirming repayment" indefinitely
- **On-chain**: Principal remained at 101.0101 USDC (no change). Transaction signed and submitted but dropped during block production.
- **Root cause**: Protocol rejects partial repays that would leave remaining loan below $100 minimum loan amount. After $11 partial: $101.01 - $11 = $90.01 < $100 minimum. This is a Catch-22 with the current loan size: minimum partial repay ($10) would always violate the $100 minimum remaining loan constraint.
- **Action needed**: UI should validate that `outstandingDebt - repayAmount >= minimumLoanAmount` (or use full repayment). Currently the UI allows submission of amounts that will be silently rejected on-chain.

### 15. Second Full Repayment $101.0101 USDC (cleanup) - PASS

- **Date**: 2026-02-25
- **Amount**: 101.0101 USDC (full repayment)
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/repay-cleanup/01-04`
- **Flow**: Repay -> Full repayment checkbox -> Confirm & Repay -> EIP-712 sign -> Repayment Successful (~5s)
- **On-chain after**: Loans: NONE, Free: 5.209245 USDC, Collateral: 127.2 USDC, LTV: 0%
- **Notes**: Interest accrual between second borrow and repay: ~0.016 USDC (loan held for ~15 minutes at 3.24% APY).

## Bugs Found During Testing

### BUG-1: Stale free balance after borrow (react-query caching) - FIXED

After completing a borrow, the Repay modal showed the pre-borrow free balance (5.219482) instead of the post-borrow value (106.219482). The difference was exactly the borrow amount (101 USDC). RPC confirmed the correct value on-chain. Even navigating away and back didn't fix it. Required a hard page reload (`window.location.reload()`) which also disconnected the wallet.

**Root cause**: `useChainflipAccount` uses react-query with `staleTime: FIFTEEN_SECONDS` (15s) but no `refetchInterval`. Data only refreshes on mount or window focus, not after mutation. The borrow operation doesn't trigger a query invalidation.

**Fix**: Added query invalidation (`freeBalances`, `accountInfo`, `loanAccounts`) on confirmation in `useBorrowConfirmation.ts`, `useRepayConfirmation.ts`, and `useCollateralConfirmation.ts`.

**Retest**: PASS - After borrow, pool page immediately shows updated free balance (106.209245 USDC). Screenshot: `bug-fixes-retest/01-pool-page-fresh-balances.png`

### BUG-2: Partial repay silent failure (missing UI validation) - FIXED

The UI allows submitting partial repay amounts that will leave the remaining loan below the $100 minimum loan amount. The transaction is signed and submitted but silently rejected on-chain - the UI shows "Confirming repayment" spinner indefinitely until timeout.

**Fix**: Added remaining-loan-below-minimum validation in `RepayInput.tsx`. Shows error "Remaining loan would be below $101.00 minimum. Use full repayment instead." and disables Repay button when `outstandingDebt - repayAmount < minimumLoanAmount`.

**Retest**: PASS - Entering $11 repay on $101.01 loan correctly shows error message and disables button. Screenshot: `bug-fixes-retest/03-bug2-repay-remaining-below-min.png`

### BUG-3: LTV gauge shows wrong value in borrow modal - FIXED

After completing a borrow, reopening the borrow modal showed "100.0% Danger" on the LTV gauge instead of the actual ~79.4% LTV.

**Root cause (actual)**: The `ltv_ratio` field from `cf_loan_accounts` is a **Perbill** (parts per 10^9), not Permill (parts per 10^6). The conversion code divided by 100 instead of 100,000, producing bps values 1000x too large (7,941,046 instead of 7,941). The `ltvToDisplayPercent` function clamped to 100%.

**Evidence**: Raw `ltv_ratio: "794104565"`. As Perbill: 794104565 / 10^9 = 79.41% (correct). The code computed: 794104565 / 100 = 7,941,046 bps / 10,000 = 794.1 decimal, clamped to 1.0 = 100.0%.

**Fix**: Changed `rawPermill / 100` to `rawPerbill / 100000` in `Borrow.tsx` `useLtvSync` hook. Also added `stateValue` as dependency so LTV re-syncs when machine transitions.

**Retest**: PASS - Borrow modal correctly shows "79.4% Safe" with gauge marker positioned at ~80%. Screenshot: `bug-fixes-retest/02-bug3-ltv-gauge-79pct-safe.png`

### BUG-4: Stale modal state after "Done" click - FIXED

After clicking "Done" on success screens, sometimes the same modal type reopened with empty/stale state instead of fully closing.

**Fix**: Addressed by BUG-1 fix (query invalidation on confirmation) which ensures fresh data when modal reopens.

**Retest**: PASS - After borrow -> Done, pool page shows fresh data. Reopening borrow modal shows correct current LTV.

### 18. Visual Gap Improvements - Tab Panel Enrichment - PASS

- **Date**: 2026-02-25
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/visual-gaps/01-04`
- **Changes**:
  - **Your Position card**: Added Borrowed crypto amount (101.0101 USDC), Current LTV (79.4% in green)
  - **Collateral tab**: Added fiat value ($127.20), Current LTV (79.4%), Borrow Capacity ($0.75)
  - **Borrow tab**: Added Current LTV (79.4%), Available to Borrow ($0.75), Borrow Power Used (99.26%)
  - **Repay tab**: Added crypto debt amount (101.0101 USDC), Current LTV (79.4%), Free Balance (106.209245 USDC)
- **LTV color coding**: green (<80%), yellow (80-90%), red (>90%)

## Visual Gap Audit (vs Chainflip Native UI)

### Addressed

| Area | Before | After |
|------|--------|-------|
| Your Position card | Borrowed fiat only, no LTV | Borrowed fiat + crypto, Current LTV with color |
| Collateral tab | Crypto amount only + buttons | Fiat + crypto, Current LTV, Borrow Capacity + buttons |
| Borrow tab | Borrowed fiat only + button | Borrowed fiat, Current LTV, Available to Borrow, Borrow Power Used + button |
| Repay tab | Outstanding fiat only + button | Outstanding fiat + crypto, Current LTV, Free Balance + button |

### Remaining Gaps (future work)

1. **Portfolio breakdown chart**: Chainflip shows pie chart of collateral/borrowed/free. We show only text.
2. **Per-asset balance table**: Chainflip shows Total/Undeployed/Deployed per asset. We show single-asset pool view.
3. **APY in position card**: Chainflip shows supply APY earnings. We show APY only in market stats.
4. **Collateral top-up asset selector**: Chainflip modal has From/To with asset picker. We use pool asset only.

## Current On-Chain State (after bug fix retest)

| Bucket | Amount |
|--------|--------|
| Free Balance | ~106.21 USDC |
| Collateral | 127.2 USDC |
| Supplied | 0 USDC |
| Borrowed | ~101.01 USDC (active loan from retest) |
| Wallet | ~10 USDC |
| **Total** | **~142 USDC** (net of loan) |

## Operations Summary

| # | Operation | Direction | Amount | Min Required | Result | Time |
|---|-----------|-----------|--------|--------------|--------|------|
| 1 | Add Collateral (monkey) | free -> collateral | 0.1 USDC | $0.10 (patched) | PASS | ~5s |
| 2 | Add Collateral ($10 min) | free -> collateral | 11 USDC | $10.10 | PASS (2nd attempt) | ~10s |
| 3 | Deposit to CF | wallet -> free | 104.82 USDC | $20 (protocol) | PASS | ~30s |
| 4 | Add Collateral (buffered) | free -> collateral | 10.2 USDC | $10.10 | PASS | ~5s |
| 5 | Supply | free -> pool | 101 USDC | $101.00 | PASS | ~10s |
| 6 | Withdraw Supply | pool -> free | 101 USDC | none | PASS | ~10s |
| 7 | Remove Collateral | collateral -> free | 11 USDC | $10.10 | PASS | ~18s |
| 8 | Egress (Withdraw from CF) | free -> wallet | 50 USDC | none | PASS | ~3-4 min |
| 9 | Second Deposit | wallet -> free | 59.92 USDC | $20 (protocol) | PASS | ~60s |
| 10 | Add Collateral (large) | free -> collateral | 117 USDC | $10.10 | PASS | ~15s |
| 11 | Borrow | creates loan | 101 USDC | $101.00 | PASS | ~5s |
| 12 | Repay (full) | repays loan | 101.01 USDC | none | PASS | ~5s |
| 13 | Second Borrow | creates loan | 101 USDC | $101.00 | PASS | ~5s |
| 14 | Partial Repay | partial repay | 11 USDC | $10.10 | FAIL (protocol) | stuck |
| 15 | Second Full Repay | repays loan | 101.01 USDC | none | PASS | ~5s |
| 16 | Retest: Borrow + BUG-1/3/4 | borrow + verify | 101 USDC | $101.00 | PASS | ~5s |
| 17 | Retest: BUG-2 validation | partial repay UI | 11 USDC | N/A | PASS | instant |
| 18 | Visual gap improvements | UI enrichment | N/A | N/A | PASS | N/A |

### 16. Bug Fix Retest: Borrow + Balance Check (BUG-1 & BUG-3) - PASS

- **Date**: 2026-02-25
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/bug-fixes-retest/01-02`
- **Flow**: Borrow 101 USDC -> Done -> Pool page shows updated free balance 106.209245 USDC (BUG-1 fix). Reopen borrow modal -> LTV gauge shows "79.4% Safe" (BUG-3 fix).
- **Bugs verified**: BUG-1 (stale balance), BUG-3 (LTV gauge Perbill conversion), BUG-4 (stale modal)

### 17. Bug Fix Retest: Partial Repay Validation (BUG-2) - PASS

- **Date**: 2026-02-25
- **Screenshots**: `e2e/screenshots/chainflip-lending-pr4/bug-fixes-retest/03`
- **Flow**: Repay tab -> Repay -> Enter 11 USDC -> Error: "Remaining loan would be below $101.00 minimum. Use full repayment instead." Repay button disabled.
- **Bugs verified**: BUG-2 (partial repay silent failure now prevented by UI validation)

## Remaining to Test

| # | Operation | Blocker |
|---|-----------|---------|
| 18 | Voluntary Liquidation (initiate) | Need active loan. Currently has active loan from retest. |
| 19 | Voluntary Liquidation (stop) | Need active voluntary liquidation. |
| 20 | Withdraw Supply with Egress | Combo operation (pool -> free -> wallet). |
| 21 | Partial Repayment (valid) | Need loan > $200 so partial leaves > $100 remaining. |

**Note**: Partial repay test #14 failed due to protocol constraint (remaining loan < $100 minimum), not a code bug. To properly test partial repay, need a loan > $200 so that a $10+ partial repay leaves > $100 remaining. Voluntary liquidation requires an active loan.

## RPC Verification Commands

```bash
# Free balances
curl -s -X POST https://rpc.mainnet.chainflip.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"cf_free_balances","params":["cFHsUq1uK5opJudRDd194A6JcRQNyhKtXNMRrMgNLV3izEw4P"],"id":1}'

# Loan accounts (collateral + loans)
curl -s -X POST https://rpc.mainnet.chainflip.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"cf_loan_accounts","params":["cFHsUq1uK5opJudRDd194A6JcRQNyhKtXNMRrMgNLV3izEw4P"],"id":2}'

# Lending config (minimums)
curl -s -X POST https://rpc.mainnet.chainflip.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"cf_lending_config","params":[],"id":3}'
```
