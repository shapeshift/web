import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero, fromBaseUnit, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { ChainflipSupportedChainId } from '../constants'
import {
  ChainflipSupportedAssetIdsByChainId,
  ChainflipSupportedChainIds,
  chainIdToChainflipNetwork,
} from '../constants'
import type { ChainflipBaasSwapDepositAddress } from '../models'
import type { ChainflipNetwork } from '../types'
import { chainflipService } from './chainflipService'

type ChainFlipBrokerBaseArgs = {
  brokerUrl: string
  apiKey: string
}

type GetChainFlipSwapArgs = ChainFlipBrokerBaseArgs & {
  sourceAsset: string
  destinationAsset: string
  destinationAddress: string
  maxBoostFee?: number
  minimumPrice: string
  refundAddress: string
  retryDurationInBlocks?: number
  commissionBps: number
  numberOfChunks?: number
  chunkIntervalBlocks?: number
}

type ChainflipAsset = {
  id: string
  ticker: string
  name: string
  network: ChainflipNetwork
  contractAddress?: string
}

export const isSupportedChainId = (chainId: ChainId): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedChainIds.includes(chainId as ChainflipSupportedChainId)
}

export const isSupportedAssetId = (
  chainId: ChainId,
  assetId: AssetId,
): chainId is ChainflipSupportedChainId => {
  const supportedAssetIds =
    ChainflipSupportedAssetIdsByChainId[chainId as ChainflipSupportedChainId]
  if (!supportedAssetIds) return false

  return supportedAssetIds.includes(assetId)
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
  maxBoostFee = 0,
  minimumPrice,
  refundAddress,
  retryDurationInBlocks = 150,
  commissionBps,
  numberOfChunks,
  chunkIntervalBlocks = 2,
}: GetChainFlipSwapArgs): Promise<
  Result<AxiosResponse<ChainflipBaasSwapDepositAddress, any>, SwapErrorRight>
> => {
  let swapUrl =
    `${brokerUrl}/swap` +
    `?apiKey=${apiKey}` +
    `&sourceAsset=${sourceAsset}` +
    `&destinationAsset=${destinationAsset}` +
    `&destinationAddress=${destinationAddress}` +
    `&boostFee=${maxBoostFee}` +
    `&minimumPrice=${minimumPrice}` +
    `&refundAddress=${refundAddress}` +
    `&retryDurationInBlocks=${retryDurationInBlocks}` +
    `&commissionBps=${commissionBps}`

  if (numberOfChunks !== undefined && chunkIntervalBlocks !== undefined) {
    swapUrl += `&numberOfChunks=${numberOfChunks}`
    swapUrl += `&chunkIntervalBlocks=${chunkIntervalBlocks}`
  }

  return chainflipService.get<ChainflipBaasSwapDepositAddress>(swapUrl)
}

const fetchChainFlipAssets = async ({
  brokerUrl,
}: Omit<ChainFlipBrokerBaseArgs, 'apiKey'>): Promise<Result<ChainflipAsset[], SwapErrorRight>> => {
  const result = await chainflipService.get<{ assets: ChainflipAsset[] }>(`${brokerUrl}/assets`)

  return result.map(({ data }) => data.assets)
}

export const getChainFlipIdFromAssetId = async ({
  assetId,
  brokerUrl,
}: Omit<ChainFlipBrokerBaseArgs, 'apiKey'> & { assetId: AssetId }): Promise<
  Result<string, SwapErrorRight>
> => {
  const maybeChainflipAssets = await fetchChainFlipAssets({
    brokerUrl,
  })
  const { assetReference, chainId } = fromAssetId(assetId)
  const _isToken = isToken(assetId)

  if (maybeChainflipAssets.isErr()) {
    return Err(
      makeSwapErrorRight({
        message: `Error fetching Chainflip assets`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  const chainflipAssets = maybeChainflipAssets.unwrap()

  const chainflipAsset = chainflipAssets.find(asset => {
    const isCorrectNetwork = asset.network === chainIdToChainflipNetwork[chainId]
    if (!isCorrectNetwork) return false

    if (_isToken) {
      return asset.contractAddress?.toLowerCase() === assetReference.toLowerCase()
    }

    return !asset.contractAddress
  })

  if (!chainflipAsset)
    return Err(
      makeSwapErrorRight({
        message: `Asset not supported by Chainflip`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )

  return Ok(chainflipAsset.id)
}
