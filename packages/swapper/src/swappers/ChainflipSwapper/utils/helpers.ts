import { type AssetId, type ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'

import type { ChainflipSupportedChainId } from '../constants'
import { ChainflipSupportedAssetIdsByChainId, ChainflipSupportedChainIds } from '../constants'

export const isSupportedChainId = (chainId: ChainId): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedChainIds.includes(chainId as ChainflipSupportedChainId)
}

export const isSupportedAssetId = (
  chainId: ChainId,
  assetId: AssetId,
): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedAssetIdsByChainId[chainId as ChainflipSupportedChainId]!.includes(
    assetId,
  )
}

export const calculateChainflipMinPrice = ({
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit,
  slippageTolerancePercentageDecimal,
  sellAsset,
  buyAsset,
}: {
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  slippageTolerancePercentageDecimal: string | undefined
  sellAsset: Asset
  buyAsset: Asset
}): string => {
  const sellAmountCryptoPrecision = fromBaseUnit(
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAsset.precision,
  )

  const buyAmountCryptoPrecision = fromBaseUnit(
    buyAmountAfterFeesCryptoBaseUnit,
    buyAsset.precision,
  )

  const estimatedPrice = bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision)

  // This is called minimumPrice upstream but this really is a rate, let's not honour confusing terminology
  const minimumRate = estimatedPrice
    .times(bn(1).minus(bnOrZero(slippageTolerancePercentageDecimal)))
    .toFixed(buyAsset.precision)

  return minimumRate
}
