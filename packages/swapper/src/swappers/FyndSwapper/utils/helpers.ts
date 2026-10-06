import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { chainIdToFeeAssetId } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Address } from 'viem'
import { getAddress, isAddress, zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { FyndSupportedChainId } from './constants'
import { FYND_CHAINS } from './constants'

const isFyndSupportedChainId = (chainId: ChainId): chainId is FyndSupportedChainId =>
  chainId in FYND_CHAINS

export const isFyndNativeAsset = (assetId: AssetId): boolean =>
  assetId === chainIdToFeeAssetId(assetId.split('/')[0])

export const convertAssetIdToFyndToken = (assetId: AssetId): Address => {
  const { assetReference } = fromAssetId(assetId)
  if (isFyndNativeAsset(assetId)) return zeroAddress
  return getAddress(assetReference)
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
  chainId,
}: {
  sellAsset: Asset
  buyAsset: Asset
  chainId?: ChainId
}): Result<FyndSupportedChainId, SwapErrorRight> => {
  if (!isFyndSupportedChainId(sellAsset.chainId) || !isFyndSupportedChainId(buyAsset.chainId)) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Fynd only supports configured EVM chains',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Fynd does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  const validAssets = [sellAsset, buyAsset].every(asset => {
    const assetParts = asset.assetId.split('/')
    const [assetChainId, assetReference] = assetParts
    return (
      assetParts.length === 2 &&
      assetChainId === asset.chainId &&
      (isFyndNativeAsset(asset.assetId) ||
        (assetReference?.startsWith('erc20:') &&
          isAddress(assetReference.slice(6)) &&
          assetReference.slice(6).toLowerCase() !== zeroAddress))
    )
  })
  if (!validAssets || (chainId !== undefined && chainId !== sellAsset.chainId)) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Invalid Fynd assets or chain',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }
  return Ok<FyndSupportedChainId, SwapErrorRight>(sellAsset.chainId)
}
