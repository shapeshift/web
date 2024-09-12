import { describe, expect, it, vi } from 'vitest'
import { bn } from 'lib/bignumber/bignumber'

import { calculateFees } from './model'
import { swapperParameters } from './parameters/swapper'

const {
  FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD,
  FEE_CURVE_MIDPOINT_USD,
  FEE_CURVE_NO_FEE_THRESHOLD_USD,
  FEE_CURVE_MAX_FEE_BPS,
  FEE_CURVE_MIN_FEE_BPS,
} = swapperParameters

const mocks = vi.hoisted(() => {
  return {
    selectIsSnapshotApiQueriesRejected: vi.fn().mockReturnValue(false),
  }
})

vi.mock('state/apis/snapshot/selectors', async importActual => {
  const actual: Record<any, any> = await importActual()
  return {
    ...actual,
    selectIsSnapshotApiQueriesRejected: mocks.selectIsSnapshotApiQueriesRejected,
  }
})

describe('calculateFees', () => {
  it('should return 0 bps for < no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD).minus(1)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(0)
  })

  it('should return FEE_CURVE_MAX_FEE_BPS - 1 for === no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(FEE_CURVE_MAX_FEE_BPS - 1)
  })

  it('should return FEE_CURVE_MAX_FEE_BPS - 1 for slightly above no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD + 0.01)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(FEE_CURVE_MAX_FEE_BPS - 1)
  })

  it('should return close to min bps for huge amounts', () => {
    const tradeAmountUsd = bn(1_000_000)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(FEE_CURVE_MIN_FEE_BPS)
  })

  it('should return close to midpoint for midpoint', () => {
    const tradeAmountUsd = bn(FEE_CURVE_MIDPOINT_USD)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(35)
  })

  it('should discount fees by 50% holding at midpoint holding half max fox discount limit', () => {
    const tradeAmountUsd = bn(FEE_CURVE_MIDPOINT_USD)
    const foxHeld = bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD / 2)
    const { feeBps, foxDiscountPercent } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(17)
    expect(foxDiscountPercent).toEqual(bn(50))
  })

  it('should discount fees 100% holding max fox discount limit', () => {
    const tradeAmountUsd = bn(Infinity)
    const foxHeld = bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD)
    const { feeBps, foxDiscountPercent } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(0)
    expect(foxDiscountPercent).toEqual(bn(100))
  })

  it('should return FEE_CURVE_MAX_FEE_BPS for failed voting power requests and above no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD + 0.01)

    mocks.selectIsSnapshotApiQueriesRejected.mockReturnValueOnce(true)
    const foxHeld = bn(0)

    const { feeBps, foxDiscountPercent } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(FEE_CURVE_MAX_FEE_BPS)
    expect(foxDiscountPercent).toEqual(bn(0))
  })
})
