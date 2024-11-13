import { type AssetId, type ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import type { ChainflipSupportedChainId } from '../constants'
import { ChainflipSupportedAssetIdsByChainId, ChainflipSupportedChainIds } from '../constants'
import type { ChainflipBaasSwapDepositAddress } from '../models'
import { chainflipService } from './chainflipService'

type GetChainFlipSwapArgs = {
  brokerUrl: string
  apiKey: string
  sourceAsset: string
  destinationAsset: string
  destinationAddress: string
  boostFee?: number
  minimumPrice: string
  refundAddress: string
  retryDurationInBlocks?: number
  commissionBps: number
}

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

export const getChainFlipSwap = ({
  brokerUrl,
  apiKey,
  sourceAsset,
  destinationAsset,
  destinationAddress,
  boostFee = 10,
  minimumPrice,
  refundAddress,
  retryDurationInBlocks = 10,
  commissionBps,
}: GetChainFlipSwapArgs): Promise<
  Result<AxiosResponse<ChainflipBaasSwapDepositAddress, any>, SwapErrorRight>
> =>
  // TODO: For DCA swaps we need to add the numberOfChunks/chunkIntervalBlocks parameters
  chainflipService.get<ChainflipBaasSwapDepositAddress>(
    `${brokerUrl}/swap` +
      `?apiKey=${apiKey}` +
      `&sourceAsset=${sourceAsset}` +
      `&destinationAsset=${destinationAsset}` +
      `&destinationAddress=${destinationAddress}` +
      `&boostFee=${boostFee}` +
      `&minimumPrice=${minimumPrice}` +
      `&refundAddress=${refundAddress}` +
      `&retryDurationInBlocks=${retryDurationInBlocks}` +
      `&commissionBps=${commissionBps}`,
  )
