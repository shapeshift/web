import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type { Asset } from 'lib/asset-service'
import type { BuildTradeInput, GetTradeQuoteInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'

import type { CowChainId, CowTrade } from '../types'
import { isCowswapSupportedChainId } from './utils'

type ValidTradeInput = {
  sellAssetAddress: string
  buyAssetAddress: string
  receiveAddress: string
}

export const validateBuildTrade = ({
  sellAsset,
  buyAsset,
  receiveAddress,
}: BuildTradeInput): Result<ValidTradeInput, SwapErrorRight> => {
  return validateTradePair(sellAsset, buyAsset, receiveAddress, 'cowBuildTrade')
}

export const validateTradeQuote = ({
  sellAsset,
  buyAsset,
  receiveAddress,
}: GetTradeQuoteInput): Result<ValidTradeInput, SwapErrorRight> => {
  return validateTradePair(sellAsset, buyAsset, receiveAddress, 'getCowSwapTradeQuote')
}

export const validateExecuteTrade = <T extends CowChainId>({
  sellAsset,
  buyAsset,
  receiveAddress,
}: CowTrade<T>): Result<ValidTradeInput, SwapErrorRight> => {
  return validateTradePair(sellAsset, buyAsset, receiveAddress, 'cowExecuteTrade')
}

export const validateTradePair = (
  sellAsset: Asset,
  buyAsset: Asset,
  receiveAddress: string | undefined,
  method: string,
): Result<ValidTradeInput, SwapErrorRight> => {
  const { assetReference: sellAssetAddress, assetNamespace: sellAssetNamespace } = fromAssetId(
    sellAsset.assetId,
  )
  const { assetReference: buyAssetAddress, chainId: buyAssetChainId } = fromAssetId(
    buyAsset.assetId,
  )

  if (!receiveAddress)
    return Err(
      makeSwapErrorRight({
        message: 'Receive address is required to build CoW trades',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )

  if (sellAssetNamespace !== 'erc20') {
    return Err(
      makeSwapErrorRight({
        message: `[${method}] - Sell asset needs to be ERC-20 to use CowSwap`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { sellAssetNamespace },
      }),
    )
  }

  if (!isCowswapSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[${method}] - Buy asset network not supported by CowSwap`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAssetChainId },
      }),
    )
  }

  return Ok({
    sellAssetAddress,
    buyAssetAddress,
    receiveAddress,
  })
}
