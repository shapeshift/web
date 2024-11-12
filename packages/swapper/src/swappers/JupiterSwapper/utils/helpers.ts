import { type AssetId, type ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'

import type { JupiterSupportedChainId } from '../types'
import { jupiterSupportedChainIds } from './constants'

export const isSupportedChainId = (chainId: ChainId): chainId is JupiterSupportedChainId => {
  return jupiterSupportedChainIds.includes(chainId as JupiterSupportedChainId)
}

export const isSupportedAssetId = (
  chainId: ChainId,
  assetId: AssetId,
): chainId is JupiterSupportedChainId => {
  return jupiterSupportedChainIds[chainId as JupiterSupportedChainId]!.includes(assetId)
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
