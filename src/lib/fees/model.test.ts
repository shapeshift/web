import { bn } from 'lib/bignumber/bignumber'

import { calculateFeeBps } from './model'
import {
  FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD,
  FEE_CURVE_MIDPOINT_USD,
  FEE_CURVE_NO_FEE_THRESHOLD_USD,
} from './parameters'

describe('calculateFees', () => {
  it('should return 0 bps for <= no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD)
    const foxHeld = bn(0)
    const bps = calculateFeeBps({
      tradeAmountUsd,
      foxHeld,
    })
    expect(bps.toNumber()).toEqual(0)
  })

  it('should return close to max bps for slightly above no fee threshold', () => {
    const tradeAmountUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD + 0.01)
    const foxHeld = bn(0)
    const bps = calculateFeeBps({
      tradeAmountUsd,
      foxHeld,
    })
    expect(bps.toNumber()).toEqual(28.552638258646432)
  })

  it('should return close to min bps for huge amounts', () => {
    const tradeAmountUsd = bn(1_000_000)
    const foxHeld = bn(0)
    const bps = calculateFeeBps({
      tradeAmountUsd,
      foxHeld,
    })
    expect(bps.toNumber()).toEqual(10.000000011220077)
  })

  it('should return close to midpoint for midpoint', () => {
    const tradeAmountUsd = bn(FEE_CURVE_MIDPOINT_USD)
    const foxHeld = bn(0)
    const bps = calculateFeeBps({
      tradeAmountUsd,
      foxHeld,
    })
    expect(bps.toNumber()).toEqual(19.5)
  })

  it('should discount fees by 50% holding at midpoint holding half max fox discount limit', () => {
    const tradeAmountUsd = bn(FEE_CURVE_MIDPOINT_USD)
    const foxHeld = bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD / 2)
    const bps = calculateFeeBps({
      tradeAmountUsd,
      foxHeld,
    })
    expect(bps.toNumber()).toEqual(9.75)
  })

  it('should discount fees 100% holding max fox discount limit', () => {
    const tradeAmountUsd = bn(Infinity)
    const foxHeld = bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD)
    const bps = calculateFeeBps({
      tradeAmountUsd,
      foxHeld,
    })
    expect(bps.toNumber()).toEqual(0)
  })
})
