import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bn, convertPrecision, isToken } from '@shapeshiftoss/utils'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import type { BebopSupportedChainId } from '../../types'
import { BEBOP_NATIVE_MARKER, bebopSupportedChainIds } from '../../types'

export const assetIdToBebopToken = (assetId: AssetId): string => {
  if (!isToken(assetId)) return BEBOP_NATIVE_MARKER
  const { assetReference } = fromAssetId(assetId)
  return getAddress(assetReference)
}

export const isSupportedChainId = (chainId: ChainId): chainId is BebopSupportedChainId => {
  return bebopSupportedChainIds.includes(chainId as BebopSupportedChainId)
}

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}) => {
  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  return Ok(true)
}

export const calculateRate = ({
  buyAmount,
  sellAmount,
  buyAsset,
  sellAsset,
}: {
  buyAmount: string
  sellAmount: string
  buyAsset: Asset
  sellAsset: Asset
}) => {
  return convertPrecision({
    value: buyAmount,
    inputExponent: buyAsset.precision,
    outputExponent: sellAsset.precision,
  })
    .dividedBy(bn(sellAmount))
    .toFixed()
}

export const isSolanaChainId = (chainId: ChainId): boolean => {
  return chainId === KnownChainIds.SolanaMainnet
}

export const assetIdToBebopSolanaToken = (assetId: AssetId): string => {
  if (assetId === solAssetId) {
    return 'So11111111111111111111111111111111111111112'
  }
  const { assetReference } = fromAssetId(assetId)
  return assetReference
}
