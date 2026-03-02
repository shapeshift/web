# PR4 Borrow Investigation - Research Log

## Loop 1: Initial State & Core Question

**Question**: Is "available to borrow" = free balance (17.75 USDC) correct?

**Hypothesis**: NO. Available to borrow should be:
`(total_collateral_usd * target_ltv) - total_borrowed_usd`

If user has no collateral, available to borrow = 0, regardless of free balance.

Free balance is what's available to ADD AS COLLATERAL, not what's available to BORROW.

## Account State (from RPC)
- scAccount: `cFHsUq1uK5opJudRDd194A6JcRQNyhKtXNMRrMgNLV3izEw4P`
- ETH address: `0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986`
- Free balance: 17.75 USDC
- Supply position: 0 (just withdrew)
- Collateral: 0
- Loans: none
- LTV thresholds: target=80%, topup=85%, soft_liq=90%, hard_liq=95%
- Minimums: loan=$100, supply=$100, update_collateral=$10, update_loan=$10
