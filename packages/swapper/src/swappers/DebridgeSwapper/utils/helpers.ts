import { fromAssetId, isAssetReference } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { chainIdToDebridgeChainId, DEFAULT_DEBRIDGE_TOKEN_ADDRESS } from '../constant'
import { isDebridgeError } from './types'

export const getDebridgeAssetAddress = (assetId: string): string => {
  if (isNativeEvmAsset(assetId)) return DEFAULT_DEBRIDGE_TOKEN_ADDRESS

  const { assetReference } = fromAssetId(assetId)

  return isAssetReference(assetReference) ? zeroAddress : assetReference
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<{ sellDebridgeChainId: number; buyDebridgeChainId: number }, SwapErrorRight> => {
  const sellDebridgeChainId = chainIdToDebridgeChainId[sellAsset.chainId]
  if (sellDebridgeChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Sell asset chain '${sellAsset.chainId}' not supported by deBridge`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const buyDebridgeChainId = chainIdToDebridgeChainId[buyAsset.chainId]
  if (buyDebridgeChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Buy asset chain '${buyAsset.chainId}' not supported by deBridge`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok({ sellDebridgeChainId, buyDebridgeChainId })
}

export const handleDebridgeError = (error: SwapErrorRight): Result<never, SwapErrorRight> => {
  if (!axios.isAxiosError(error.cause)) {
    return Err(makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }))
  }

  const debridgeError = error.cause?.response?.data

  if (!isDebridgeError(debridgeError)) {
    return Err(makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }))
  }

  const errorMessage = debridgeError.errorMessage ?? debridgeError.message ?? 'Unknown error'

  return Err(makeSwapErrorRight({ message: errorMessage, code: TradeQuoteError.UnknownError }))
}
