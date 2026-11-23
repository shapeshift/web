import {
  fromAssetId,
  isAssetReference,
  solanaChainId,
  usdcOnSolanaAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import {
  ACROSS_APP_FEE_SHARE,
  chainIdToAcrossChainId,
  DEFAULT_ACROSS_EVM_TOKEN_ADDRESS,
  DEFAULT_ACROSS_EVM_USER_ADDRESS,
  DEFAULT_ACROSS_SOLANA_USER_ADDRESS,
} from '../constant'

export const getAcrossAssetAddress = (assetId: string): string => {
  if (isNativeEvmAsset(assetId)) return DEFAULT_ACROSS_EVM_TOKEN_ADDRESS

  const { assetReference } = fromAssetId(assetId)

  return isAssetReference(assetReference) ? zeroAddress : assetReference
}

export const getAcrossAppFeeBps = (affiliateBps: string): number =>
  bnOrZero(affiliateBps).div(ACROSS_APP_FEE_SHARE).integerValue(BigNumber.ROUND_CEIL).toNumber()

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

  // Solana origins need a post-broadcast execution submission, which isn't wired yet
  if (sellAsset.chainId === solanaChainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Across does not support Solana as a source chain',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok({ sellAcrossChainId, buyAcrossChainId })
}
