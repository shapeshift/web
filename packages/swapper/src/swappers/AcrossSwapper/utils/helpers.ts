import {
  fromAssetId,
  isAssetReference,
  solanaChainId,
  usdcOnSolanaAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import {
  ACROSS_SOLANA_TOKEN_ADDRESS,
  chainIdToAcrossChainId,
  DEFAULT_ACROSS_EVM_TOKEN_ADDRESS,
  DEFAULT_ACROSS_EVM_USER_ADDRESS,
  DEFAULT_ACROSS_SOLANA_USER_ADDRESS,
} from '../constant'

export const getAcrossAssetAddress = (assetId: string): string => {
  if (isNativeEvmAsset(assetId)) return DEFAULT_ACROSS_EVM_TOKEN_ADDRESS

  const { chainId, assetReference } = fromAssetId(assetId)
  if (chainId === solanaChainId && !isAssetReference(assetReference)) return assetReference
  if (chainId === solanaChainId) return ACROSS_SOLANA_TOKEN_ADDRESS

  return isAssetReference(assetReference) ? zeroAddress : assetReference
}

export const getDefaultUserAddress = (chainId: string): string => {
  if (chainId === solanaChainId) return DEFAULT_ACROSS_SOLANA_USER_ADDRESS
  return DEFAULT_ACROSS_EVM_USER_ADDRESS
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<{ sellAcrossChainId: number; buyAcrossChainId: number }, SwapErrorRight> => {
  if (sellAsset.chainId === buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Across does not support same-chain swaps',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const sellAcrossChainId = chainIdToAcrossChainId[sellAsset.chainId]
  const buyAcrossChainId = chainIdToAcrossChainId[buyAsset.chainId]

  if (sellAcrossChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Sell asset chain '${sellAsset.chainId}' not supported by Across`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (buyAcrossChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Buy asset chain '${buyAsset.chainId}' not supported by Across`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Across only supports USDC as the bridgeable token on Solana destinations
  if (buyAsset.chainId === solanaChainId && buyAsset.assetId !== usdcOnSolanaAssetId) {
    return Err(
      makeSwapErrorRight({
        message: 'Across only supports USDC as destination token on Solana',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok({ sellAcrossChainId, buyAcrossChainId })
}
