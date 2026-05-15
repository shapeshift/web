import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { convertBasisPointsToDecimalPercentage, convertPrecision } from '@shapeshiftoss/utils'

import type { SwapperConfig, SwapperName } from '../../types'
import type { MidgardPoolResponse } from '../index'
import {
  getMidgardUrl,
  getNativeFee,
  getNativePrecision,
  getPoolAssetId,
  getSwapperNativeAssetId,
  isNativeAsset,
  thorService,
} from '../index'

// Convert native fee to sell asset's native precision before dividing by `assetPrice`.
// MAYA's CACAO is 10-dec but pool assets are 8-dec — skip this and the result is 100x off.
export const getOutboundFeeSellAssetThorBaseUnit = (
  runePerAsset: string,
  sellAssetId: AssetId,
  swapperName: SwapperName,
) => {
  const nativeFeeSellAssetThorBaseUnit = convertPrecision({
    value: getNativeFee(swapperName),
    inputExponent: getNativePrecision(getSwapperNativeAssetId(swapperName), swapperName),
    outputExponent: getNativePrecision(sellAssetId, swapperName),
  })
  return nativeFeeSellAssetThorBaseUnit.dividedBy(runePerAsset)
}

export const getExpectedAffiliateFeeSellAssetThorBaseUnit = (
  sellAmountCryptoBaseUnit: string,
  sellAsset: Asset,
  affiliateBps: string,
  swapperName: SwapperName,
) => {
  const sellAmountThorBaseUnit = convertPrecision({
    value: sellAmountCryptoBaseUnit,
    inputExponent: sellAsset.precision,
    outputExponent: getNativePrecision(sellAsset.assetId, swapperName),
  })

  const affiliatePercent = convertBasisPointsToDecimalPercentage(affiliateBps)

  return sellAmountThorBaseUnit.times(affiliatePercent)
}

// don't apply an affiliate fee if it's below the outbound fee for the inbound pool
export const getThresholdedAffiliateBps = async ({
  sellAsset,
  affiliateBps,
  sellAmountCryptoBaseUnit,
  config,
  swapperName,
}: {
  sellAsset: Asset
  affiliateBps: string
  sellAmountCryptoBaseUnit: string
  config: SwapperConfig
  swapperName: SwapperName
}) => {
  const midgardUrl = getMidgardUrl(config, swapperName)

  const outboundFeeSellAssetThorBaseUnit = await (async () => {
    if (isNativeAsset(sellAsset.assetId, swapperName)) return getNativeFee(swapperName)

    const sellPoolId = getPoolAssetId({ assetId: sellAsset.assetId, swapperName })

    // get pool data for the sell asset
    const res = await thorService.get<MidgardPoolResponse>(`${midgardUrl}/pool/${sellPoolId}`)
    if (res.isErr()) throw res.unwrapErr()

    const pool = res.unwrap().data

    // calculate the rune outbound fee denominated in the sell asset, in thor base units
    return getOutboundFeeSellAssetThorBaseUnit(pool.assetPrice, sellAsset.assetId, swapperName)
  })()

  // calculate the expected affiliate fee, in thor base units
  const expectedAffiliateFeeSellAssetThorBaseUnit = getExpectedAffiliateFeeSellAssetThorBaseUnit(
    sellAmountCryptoBaseUnit,
    sellAsset,
    affiliateBps,
    swapperName,
  )

  const isAffiliateFeeBelowOutboundFee = expectedAffiliateFeeSellAssetThorBaseUnit.lte(
    outboundFeeSellAssetThorBaseUnit,
  )

  return isAffiliateFeeBelowOutboundFee ? '0' : affiliateBps
}
