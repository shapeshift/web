import { describe, expect, it } from 'vitest'
import { bn } from 'lib/bignumber/bignumber'

import { calculateFees } from './model'
import { swapperParameters } from './parameters/swapper'

const {
  FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD,
  FEE_CURVE_MIDPOINT_USD,
  FEE_CURVE_NO_FEE_THRESHOLD_USD,
} = swapperParameters

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

  it('should return ~28bps for === no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(29)
  })

  it('should return close to max bps for slightly above no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD + 0.01)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(29)
  })

  it('should return close to min bps for huge amounts', () => {
    const tradeAmountUsd = bn(1_000_000)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(10)
  })

  it('should return close to midpoint for midpoint', () => {
    const tradeAmountUsd = bn(FEE_CURVE_MIDPOINT_USD)
    const foxHeld = bn(0)
    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(20)
  })

  it('should discount fees by 50% holding at midpoint holding half max fox discount limit', () => {
    const tradeAmountUsd = bn(FEE_CURVE_MIDPOINT_USD)
    const foxHeld = bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD / 2)
    const { feeBps, foxDiscountPercent } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(10)
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

  it('should return 0 bps for missing foxHeld and above no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD + 0.01)
    const foxHeld = undefined
    const { feeBps, foxDiscountPercent } = calculateFees({
      tradeAmountUsd,
      foxHeld,
      feeModel: 'SWAPPER',
    })
    expect(feeBps.toNumber()).toEqual(0)
    expect(foxDiscountPercent).toEqual(bn(100))
  })
})
