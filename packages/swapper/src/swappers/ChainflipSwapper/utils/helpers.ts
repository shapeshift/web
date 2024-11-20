import { type AssetId, type ChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import { isToken } from '../../../utils'
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
  boostFee?: number
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
  numberOfChunks = undefined, 
  chunkIntervalBlocks = 2                
}: GetChainFlipSwapArgs): Promise<
  Result<AxiosResponse<ChainflipBaasSwapDepositAddress, any>, SwapErrorRight>
> => {
  let swapUrl = `${brokerUrl}/swap` +
    `?apiKey=${apiKey}` +
    `&sourceAsset=${sourceAsset}` +
    `&destinationAsset=${destinationAsset}` +
    `&destinationAddress=${destinationAddress}` +
    `&boostFee=${boostFee}` +
    `&minimumPrice=${minimumPrice}` +
    `&refundAddress=${refundAddress}` +
    `&retryDurationInBlocks=${retryDurationInBlocks}` +
    `&commissionBps=${commissionBps}`

  if (numberOfChunks) {
    swapUrl += 
      `&numberOfChunks=${numberOfChunks}` +
      `&chunkIntervalBlocks=${chunkIntervalBlocks}`
  }

  return chainflipService.get<ChainflipBaasSwapDepositAddress>(swapUrl)
}

const fetchChainFlipAssets = async ({
  brokerUrl,
}: Omit<ChainFlipBrokerBaseArgs, 'apiKey'>): Promise<ChainflipAsset[]> => {
  const result = await chainflipService.get<{ assets: ChainflipAsset[] }>(`${brokerUrl}/assets`)

  if (result.isErr()) throw result.unwrapErr()

  const { data } = result.unwrap()

  return data.assets
}

export const getChainFlipIdFromAssetId = async ({
  assetId,
  brokerUrl,
}: Omit<ChainFlipBrokerBaseArgs, 'apiKey'> & { assetId: AssetId }) => {
  const chainflipAssets = await fetchChainFlipAssets({
    brokerUrl,
  })
  const { assetReference, chainId } = fromAssetId(assetId)
  const _isToken = isToken(assetId)

  const chainflipAsset = chainflipAssets.find(asset => {
    const isCorrectNetwork = asset.network === chainIdToChainflipNetwork[chainId]
    if (!isCorrectNetwork) return false

    if (_isToken) {
      return asset.contractAddress?.toLowerCase() === assetReference.toLowerCase()
    }

    return !asset.contractAddress
  })

  if (!chainflipAsset) throw new Error('Asset not found')

  return chainflipAsset.id
}
