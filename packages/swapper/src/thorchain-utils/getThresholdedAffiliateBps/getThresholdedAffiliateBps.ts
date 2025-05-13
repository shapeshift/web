import type { Asset } from '@shapeshiftoss/types'
import { bn, convertBasisPointsToDecimalPercentage, convertPrecision } from '@shapeshiftoss/utils'

import type { SwapperConfig, SwapperName } from '../../types'
import type { MidgardPoolResponse } from '../index'
import {
  getMidgardUrl,
  getNativeFee,
  getNativePrecision,
  getPoolAssetId,
  isNativeAsset,
  service,
} from '../index'

export const getOutboundFeeInSellAssetThorBaseUnit = (
  runePerAsset: string,
  swapperName: SwapperName,
) => {
  return bn(getNativeFee(swapperName)).dividedBy(runePerAsset)
}

export const getExpectedAffiliateFeeSellAssetThorUnit = (
  sellAmountCryptoBaseUnit: string,
  sellAsset: Asset,
  affiliateBps: string,
  swapperName: SwapperName,
) => {
  const sellAmountThorUnit = convertPrecision({
    value: sellAmountCryptoBaseUnit,
    inputExponent: sellAsset.precision,
    outputExponent: getNativePrecision(swapperName),
  })

  const affiliatePercent = convertBasisPointsToDecimalPercentage(affiliateBps)

  return sellAmountThorUnit.times(affiliatePercent)
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

  const outboundFeeSellAssetThorUnit = await (async () => {
    if (isNativeAsset(sellAsset.assetId, swapperName)) return getNativeFee(swapperName)

    const sellPoolId = getPoolAssetId({ assetId: sellAsset.assetId, swapperName })

    // get pool data for the sell asset
    const res = await service.get<MidgardPoolResponse>(`${midgardUrl}/pool/${sellPoolId}`)
    if (res.isErr()) throw res.unwrapErr()

    const pool = res.unwrap().data

    // calculate the rune outbound fee denominated in the sell asset, in native units
    return getOutboundFeeInSellAssetThorBaseUnit(pool.assetPrice, swapperName)
  })()

  // calculate the expected affiliate fee, in native units
  const expectedAffiliateFeeSellAssetThorUnit = getExpectedAffiliateFeeSellAssetThorUnit(
    sellAmountCryptoBaseUnit,
    sellAsset,
    affiliateBps,
    swapperName,
  )

  const isAffiliateFeeBelowOutboundFee = expectedAffiliateFeeSellAssetThorUnit.lte(
    outboundFeeSellAssetThorUnit,
  )

  return isAffiliateFeeBelowOutboundFee ? '0' : affiliateBps
}
