import BigNumber from 'bignumber.js'
import { getConfig } from 'config'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import {
  FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS,
  FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS,
  FOX_WIF_HAT_MINIMUM_AMOUNT_BASE_UNIT,
} from './constant'
import { FEE_CURVE_PARAMETERS } from './parameters'
import type { ParameterModel } from './parameters/types'
import { FeeDiscountType } from './types'

export const THORSWAP_UNIT_THRESHOLD = 1
export const THORSWAP_MAXIMUM_YEAR_TRESHOLD = 2025

type CalculateFeeBpsArgs = {
  tradeAmountUsd: BigNumber
  foxHeld: BigNumber
  thorHeld: BigNumber
  foxWifHatHeldCryptoBaseUnit: BigNumber
  feeModel: ParameterModel
  isSnapshotApiQueriesRejected: boolean
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
 * @property {FeeDiscountType} appliedDiscount - The type of discount applied to the fee.
 */
export type CalculateFeeBpsReturn = {
  feeBps: BigNumber
  feeBpsFloat: BigNumber
  feeUsd: BigNumber
  foxDiscountPercent: BigNumber
  foxDiscountUsd: BigNumber
  feeUsdBeforeDiscount: BigNumber
  feeBpsBeforeDiscount: BigNumber
  appliedDiscountType: FeeDiscountType
}
type CalculateFeeBps = (args: CalculateFeeBpsArgs) => CalculateFeeBpsReturn

export const calculateFees: CalculateFeeBps = ({
  tradeAmountUsd,
  foxHeld,
  feeModel,
  thorHeld,
  foxWifHatHeldCryptoBaseUnit,
  isSnapshotApiQueriesRejected,
}) => {
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
  const isFoxWifHatEnabled = getConfig().REACT_APP_FEATURE_FOX_PAGE_FOX_WIF_HAT_SECTION

  const isFoxWifHatCampaignActive =
    new Date().getTime() >= FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS &&
    new Date().getTime() <= FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS &&
    isFoxWifHatEnabled

  const isFoxWifHatDiscountEligible =
    isFoxWifHatCampaignActive &&
    foxWifHatHeldCryptoBaseUnit &&
    foxWifHatHeldCryptoBaseUnit?.gte(FOX_WIF_HAT_MINIMUM_AMOUNT_BASE_UNIT)

  const currentFoxWifHatDiscountPercent = (() => {
    if (!isFoxWifHatCampaignActive) return bn(0)
    if (!isFoxWifHatDiscountEligible) return bn(0)

    const currentTime = new Date().getTime()
    const totalCampaignDuration =
      FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS - FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS
    const timeElapsed = currentTime - FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS
    const remainingPercentage = bn(100).times(
      bn(1).minus(bn(timeElapsed).div(totalCampaignDuration)),
    )

    return BigNumber.maximum(BigNumber.minimum(remainingPercentage, bn(100)), bn(0))
  })()

  // trades below the fee threshold are free.
  const isFree = tradeAmountUsd.lt(noFeeThresholdUsd)

  const isThorFree =
    isThorFreeEnabled &&
    thorHeld.gte(THORSWAP_UNIT_THRESHOLD) &&
    new Date().getUTCFullYear() < THORSWAP_MAXIMUM_YEAR_TRESHOLD

  // failure to fetch fox discount results in free trades.
  const isFallbackFees = isSnapshotApiQueriesRejected

  // the fox discount before any other logic is applied
  const foxBaseDiscountPercent = (() => {
    if (isFree) return bn(100)
    // THOR holder before TIP014 are trade free until 2025
    if (isThorFree) return bn(100)

    const foxDiscountPercent = bnOrZero(foxHeld)
      .times(100)
      .div(bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD))

    // No discount if we cannot fetch FOX holdings and we are not eligible for the WIF HAT campaign
    if (isFallbackFees && !isFoxWifHatDiscountEligible) return bn(0)

    return BigNumber.maximum(foxDiscountPercent, currentFoxWifHatDiscountPercent)
  })()

  // the fee bps before the fox discount is applied, as a floating point number
  const feeBpsBeforeDiscountFloat =
    isFallbackFees && !isFree && !isThorFree && !isFoxWifHatDiscountEligible
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
    isFallbackFees && !isFree && !isThorFree && !isFoxWifHatDiscountEligible
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

  const appliedDiscountType = (() => {
    if (isFree) return FeeDiscountType.UNDER_THRESHOLD
    if (isThorFree) return FeeDiscountType.THOR_HOLDER

    const foxDiscountAmount = bnOrZero(foxHeld)
      .times(100)
      .div(bn(FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD))

    if (isFoxWifHatDiscountEligible && currentFoxWifHatDiscountPercent.gt(foxDiscountAmount)) {
      return FeeDiscountType.FOX_WIF_HAT
    }

    if (foxDiscountAmount.gt(0)) {
      return FeeDiscountType.FOX_HOLDER
    }

    return FeeDiscountType.NONE
  })()

  return {
    feeBps,
    feeBpsFloat,
    feeUsd,
    foxDiscountPercent,
    foxDiscountUsd,
    feeUsdBeforeDiscount,
    feeBpsBeforeDiscount,
    appliedDiscountType,
  }
}
