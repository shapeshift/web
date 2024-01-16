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
  feeBpsRaw: BigNumber
  feeUsd: BigNumber
  feeUsdDiscount: BigNumber
  foxDiscountPercent: BigNumber
  foxDiscountUsd: BigNumber
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

  const isFree = tradeAmountUsd.lt(noFeeThresholdUsd)

  // the following raw values are before the realities of integer bps on-chain
  const foxDiscountPercentRaw = isFree
    ? bn(100)
    : BigNumber.minimum(bn(100), foxHeld.times(100).div(bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD)))

  const feeBpsBeforeDiscountRaw = minFeeBps.plus(
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
  const feeBpsRaw = BigNumber.maximum(
    feeBpsBeforeDiscountRaw.multipliedBy(bn(1).minus(foxDiscountPercentRaw.div(100))),
    bn(0),
  )

  const feeBpsBeforeDiscount = feeBpsBeforeDiscountRaw.decimalPlaces(0)
  const feeBpsAfterDiscount = feeBpsRaw.decimalPlaces(0)
  const foxDiscountPercent = feeBpsBeforeDiscountRaw
    .minus(feeBpsRaw)
    .div(feeBpsBeforeDiscountRaw)
    .times(100)

  const feeBps = feeBpsAfterDiscount
  const feeUsdBeforeDiscount = tradeAmountUsd.multipliedBy(feeBpsBeforeDiscount.div(bn(10000)))
  const feeUsdDiscount = feeUsdBeforeDiscount.multipliedBy(foxDiscountPercent.div(100))
  const feeUsd = feeUsdBeforeDiscount.minus(feeUsdDiscount)
  const foxDiscountUsd = feeUsdBeforeDiscount.times(foxDiscountPercent.div(100))

  return {
    feeBps,
    feeBpsRaw,
    feeUsd,
    feeUsdDiscount,
    foxDiscountPercent,
    foxDiscountUsd,
    feeUsdBeforeDiscount,
    feeBpsBeforeDiscount,
  }
}
