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

type CalculateFeeBps = (args: CalculateFeeBpsArgs) => BigNumber

export const calculateFeeBps: CalculateFeeBps = ({ tradeAmountUsd, foxHeld }): BigNumber => {
  const noFeeThresholdUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD)
  const maxFeeBps = bn(FEE_CURVE_MAX_FEE_BPS)
  const minFeeBps = bn(FEE_CURVE_MIN_FEE_BPS)
  const midpointUsd = bn(FEE_CURVE_MIDPOINT_USD)
  const feeCurveSteepness = bn(FEE_CURVE_STEEPNESS_K)
  if (tradeAmountUsd.lte(noFeeThresholdUsd)) return bn(0)

  const sigmoidFee = minFeeBps.plus(
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

  const foxDiscount = foxHeld.div(bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD))

  const feeBps = sigmoidFee.multipliedBy(bn(1).minus(foxDiscount))

  return BigNumber.maximum(feeBps, bn(0))
}
