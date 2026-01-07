# Yield.xyz Fees Implementation Plan

## Overview

Enable fee collection on yield.xyz operations. Available fee types depend on the specific yield opportunity.

## Fee Types (by Opportunity)

Based on [yield.xyz documentation](https://docs.yield.xyz/docs/fees):

| Fee Type | Range | Applied To | Notes |
|----------|-------|------------|-------|
| **Performance Fee** | 10-30% | Gains at harvest | Industry standard for DeFi |
| **Management Fee** | 1-5% annually | Total AUM | Continuous, regardless of performance |
| **Deposit Fee** | 0.2-0.8% | User deposits | Immediate, at point of entry |

**Per Opportunity**: Available fee types are returned in `possibleFeeTakingMechanisms`:
```typescript
{
  depositFee: boolean,
  managementFee: boolean,
  performanceFee: boolean,
  validatorRebates: boolean
}
```

**Recommended**: Use **performance fee (55bps)** as it only charges realized gains, preserving user principal.

## Fee Rate

- **Rate**: 55 basis points (0.55%)
- **Existing constant**: `src/lib/fees/constant.ts` already has `DEFAULT_FEE_BPS = '55'`

## Setup Requirements

### 1. yield.xyz Dashboard

**Payout Wallet:**
- Add ShapeShift treasury address(es) at [dashboard.stakek.it](https://dashboard.stakek.it)
- Configure per chain as needed (ETH, Base, Arbitrum, etc.)

**Fee Configuration:**
- Select project → "Fee Configuration" section
- For each yield opportunity, add the applicable fee:
  - Performance fee: 55bps
  - Management fee: if available and preferred
  - Deposit fee: avoid (bad UX, visible to users)
- Request activation → yield.xyz deploys contracts → status = "LIVE"

### 2. App Code

**No changes required** - the `DEFAULT_FEE_BPS = '55'` constant already exists for affiliate fees and applies here as well.

## Fee Collection

Once configured and LIVE, fees auto-collect:
- **Performance/Management**: At harvest (mints new shares to treasury)
- **Deposit**: At deposit (atomic via FeeWrapper or custom instructions)

## UI

**No UI changes** - fees are silent (not shown to users).

## Current Status

| Item | Status |
|------|--------|
| Fee constant (55bps) | ✅ Complete |
| Dashboard - payout wallet | ⏳ Pending |
| Dashboard - fee config | ⏳ Pending (per opportunity) |
| Fee collection | ⏳ Pending (automatic when LIVE) |

## References

- [yield.xyz Fees](https://docs.yield.xyz/docs/fees)
- [yield.xyz Performance Fees](https://docs.yield.xyz/docs/performance)
- [yield.xyz Deposit Fees](https://docs.yield.xyz/docs/deposit-fees)
- [yield.xyz Dashboard](https://dashboard.stakek.it)
- Code: `src/lib/fees/constant.ts`
