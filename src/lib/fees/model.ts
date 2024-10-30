import BigNumber from 'bignumber.js'
import { getConfig } from 'config'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectIsSnapshotApiQueriesRejected } from 'state/apis/snapshot/selectors'
import { store } from 'state/store'

import { FEE_CURVE_PARAMETERS } from './parameters'
import type { ParameterModel } from './parameters/types'

export const THORSWAP_UNIT_THRESHOLD = 1
const THORSWAP_MAXIMUM_YEAR_TRESHOLD = 2025

type CalculateFeeBpsArgs = {
  tradeAmountUsd: BigNumber
  foxHeld: BigNumber
  thorHeld?: BigNumber
  feeModel: ParameterModel
}

/**
 * Represents the return type for calculating fee basis points (bps).
 * @type {Object} CalculateFeeBpsReturn
 * @property {BigNumber} feeBps - The net fee bps (i.e., including the fox discount) used for actual trades.
 * @property {BigNumber} feeBpsFloat - `feeBps` as a floating point number, used for plotting the theoretical bps ignoring the realities of integer bps values.
 * @property {BigNumber} feeUsd - The net USD value of the fee (i.e., including the fox discount).
 * @property {BigNumber} foxDiscountPercent - The fox discount as a percentage of the gross fee.
 * @property {BigNumber} foxDiscountUsd - The USD value of the fox discount.
 * @property {BigNumber} feeUsdBeforeDiscount - The gross USD value of the fee (i.e., excluding the fox discount).
 * @property {BigNumber} feeBpsBeforeDiscount - The gross fee bps (i.e., excluding the fox discount).
 */
export type CalculateFeeBpsReturn = {
  feeBps: BigNumber
  feeBpsFloat: BigNumber
  feeUsd: BigNumber
  foxDiscountPercent: BigNumber
  foxDiscountUsd: BigNumber
  feeUsdBeforeDiscount: BigNumber
  feeBpsBeforeDiscount: BigNumber
}
type CalculateFeeBps = (args: CalculateFeeBpsArgs) => CalculateFeeBpsReturn

export const calculateFees: CalculateFeeBps = ({ tradeAmountUsd, foxHeld, feeModel, thorHeld }) => {
  const {
    FEE_CURVE_NO_FEE_THRESHOLD_USD,
    FEE_CURVE_MAX_FEE_BPS,
    FEE_CURVE_MIN_FEE_BPS,
    FEE_CURVE_MIDPOINT_USD,
    FEE_CURVE_STEEPNESS_K,
    FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD,
  } = FEE_CURVE_PARAMETERS[feeModel]
  const noFeeThresholdUsd = bn(FEE_CURVE_NO_FEE_THRESHOLD_USD)
  const maxFeeBps = bn(FEE_CURVE_MAX_FEE_BPS)
  const minFeeBps = bn(FEE_CURVE_MIN_FEE_BPS)
  const midpointUsd = bn(FEE_CURVE_MIDPOINT_USD)
  const feeCurveSteepness = bn(FEE_CURVE_STEEPNESS_K)
  const isThorFreeEnabled = getConfig().REACT_APP_FEATURE_THOR_FREE_FEES

  // trades below the fee threshold are free.
  const isFree =
    tradeAmountUsd.lt(noFeeThresholdUsd) ||
    (isThorFreeEnabled && thorHeld?.isGreaterThanOrEqualTo(THORSWAP_UNIT_THRESHOLD))

  const isThorFree =
    isThorFreeEnabled &&
    thorHeld?.isGreaterThanOrEqualTo(THORSWAP_UNIT_THRESHOLD) &&
    new Date().getUTCFullYear() < THORSWAP_MAXIMUM_YEAR_TRESHOLD

  // failure to fetch fox discount results in free trades.
  const isFallbackFees = selectIsSnapshotApiQueriesRejected(store.getState())

  // the fox discount before any other logic is applied
  const foxBaseDiscountPercent = (() => {
    if (isFree) return bn(100)
    // THOR holder before TIP014 are trade free until 2025
    if (isThorFree) return bn(100)
    // No discount if we cannot fetch FOX holdings
    if (isFallbackFees) return bn(0)

    return BigNumber.minimum(
      bn(100),
      bnOrZero(foxHeld).times(100).div(bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD)),
    )
  })()

  // the fee bps before the fox discount is applied, as a floating point number
  const feeBpsBeforeDiscountFloat =
    isFallbackFees && !isFree && !isThorFree
      ? bn(FEE_CURVE_MAX_FEE_BPS)
      : minFeeBps.plus(
          maxFeeBps
            .minus(minFeeBps)
            .div(
              bn(1).plus(
                bn(
                  Math.exp(
                    bn(1)
                      .div(feeCurveSteepness)
                      .times(tradeAmountUsd.minus(midpointUsd))
                      .toNumber(),
                  ),
                ),
              ),
            ),
        )

  const feeBpsFloat =
    isFallbackFees && !isFree && !isThorFree
      ? bn(FEE_CURVE_MAX_FEE_BPS)
      : BigNumber.maximum(
          feeBpsBeforeDiscountFloat.multipliedBy(bn(1).minus(foxBaseDiscountPercent.div(100))),
          bn(0),
        )

  const feeBpsBeforeDiscount = feeBpsBeforeDiscountFloat.decimalPlaces(0)
  const feeBpsAfterDiscount = feeBpsFloat.decimalPlaces(0)
  const foxDiscountPercent = feeBpsBeforeDiscountFloat
    .minus(feeBpsFloat)
    .div(feeBpsBeforeDiscountFloat)
    .times(100)

  const feeBps = feeBpsAfterDiscount
  const feeUsdBeforeDiscount = tradeAmountUsd.multipliedBy(feeBpsBeforeDiscount.div(bn(10000)))
  const feeUsdDiscount = feeUsdBeforeDiscount.multipliedBy(foxDiscountPercent.div(100))
  const feeUsd = feeUsdBeforeDiscount.minus(feeUsdDiscount)
  const foxDiscountUsd = feeUsdBeforeDiscount.times(foxDiscountPercent.div(100))

  return {
    feeBps,
    feeBpsFloat,
    feeUsd,
    foxDiscountPercent,
    foxDiscountUsd,
    feeUsdBeforeDiscount,
    feeBpsBeforeDiscount,
  }
}
