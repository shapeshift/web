import BigNumber from 'bignumber.js'
import { bn } from 'lib/bignumber/bignumber'

import {
  FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD,
  FEE_CURVE_MAX_FEE_BPS,
  FEE_CURVE_MIDPOINT_USD,
  FEE_CURVE_MIN_FEE_BPS,
  FEE_CURVE_NO_FEE_THRESHOLD_USD,
  FEE_CURVE_STEEPNESS_K,
} from './parameters'

type CalculateFeeBpsArgs = {
  tradeAmountUsd: BigNumber
  foxHeld: BigNumber
}

type CalculateFeeBpsReturn = {
  feeBps: BigNumber
  feeUsd: BigNumber
  feeUsdDiscount: BigNumber
  foxDiscountPercent: BigNumber
  feeUsdBeforeDiscount: BigNumber
  feeBpsBeforeDiscount: BigNumber
}
type CalculateFeeBps = (args: CalculateFeeBpsArgs) => CalculateFeeBpsReturn

export const calculateFees: CalculateFeeBps = ({ tradeAmountUsd, foxHeld }) => {
  const noFeeThresholdUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD)
  const maxFeeBps = bn(FEE_CURVE_MAX_FEE_BPS)
  const minFeeBps = bn(FEE_CURVE_MIN_FEE_BPS)
  const midpointUsd = bn(FEE_CURVE_MIDPOINT_USD)
  const feeCurveSteepness = bn(FEE_CURVE_STEEPNESS_K)

  const foxDiscountPercent = BigNumber.minimum(
    bn(100),
    foxHeld.times(100).div(bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD)),
  )

  if (tradeAmountUsd.lte(noFeeThresholdUsd)) {
    return {
      feeBps: bn(0),
      feeUsd: bn(0),
      feeUsdDiscount: bn(0),
      foxDiscountPercent,
      feeUsdBeforeDiscount: bn(0),
      feeBpsBeforeDiscount: bn(0),
    }
  }

  const feeBpsBeforeDiscount = minFeeBps.plus(
    maxFeeBps
      .minus(minFeeBps)
      .div(
        bn(1).plus(
          bn(
            Math.exp(
              bn(1).div(feeCurveSteepness).times(tradeAmountUsd.minus(midpointUsd)).toNumber(),
            ),
          ),
        ),
      ),
  )

  const feeBps = BigNumber.maximum(
    feeBpsBeforeDiscount.multipliedBy(bn(1).minus(foxDiscountPercent.div(100))),
    bn(0),
  )
  const feeUsdBeforeDiscount = tradeAmountUsd.multipliedBy(feeBpsBeforeDiscount.div(bn(10000)))
  const feeUsdDiscount = feeUsdBeforeDiscount.multipliedBy(foxDiscountPercent.div(100))
  const feeUsd = feeUsdBeforeDiscount.minus(feeUsdDiscount)

  return {
    feeBps,
    feeUsd,
    feeUsdDiscount,
    foxDiscountPercent,
    feeUsdBeforeDiscount,
    feeBpsBeforeDiscount,
  }
}
