import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  binanceChainId,
  ethChainId,
  fromAssetId,
  hyperEvmChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  sonicChainId,
} from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero, convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { SwapErrorRight } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import { chainIdToPortalsNetwork } from '../constants'
import type { PortalsSupportedChainId } from '../types'
import { PortalsSupportedChainIds } from '../types'

export const isSupportedChainId = (chainId: ChainId): chainId is PortalsSupportedChainId => {
  return PortalsSupportedChainIds.includes(chainId as PortalsSupportedChainId)
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<
  { sellChainId: PortalsSupportedChainId; buyChainId: PortalsSupportedChainId },
  SwapErrorRight
> => {
  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  return Ok({ sellChainId: sellAsset.chainId, buyChainId: buyAsset.chainId })
}

// Builds the `network:address` token pair Portals expects, native assets mapped to the zero address
export const getPortalsTokens = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<{ inputToken: string; outputToken: string }, SwapErrorRight> => {
  const sellPortalsNetwork = chainIdToPortalsNetwork[sellAsset.chainId as KnownChainIds]
  const buyPortalsNetwork = chainIdToPortalsNetwork[buyAsset.chainId as KnownChainIds]

  if (!sellPortalsNetwork) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!buyPortalsNetwork) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  const sellAssetAddress = isNativeEvmAsset(sellAsset.assetId)
    ? zeroAddress
    : fromAssetId(sellAsset.assetId).assetReference
  const buyAssetAddress = isNativeEvmAsset(buyAsset.assetId)
    ? zeroAddress
    : fromAssetId(buyAsset.assetId).assetReference

  return Ok({
    inputToken: `${sellPortalsNetwork}:${sellAssetAddress}`,
    outputToken: `${buyPortalsNetwork}:${buyAssetAddress}`,
  })
}

// Portals expects whole percentages (e.g. 1 for 1%), not bps or decimals
export const getPortalsPercentages = ({
  affiliateBps,
  slippageTolerancePercentageDecimal,
}: {
  affiliateBps: string
  slippageTolerancePercentageDecimal: string | undefined
}): { affiliateBpsPercentage: number; slippageTolerancePercentage: number } => {
  const affiliateBpsPercentage = convertBasisPointsToDecimalPercentage(affiliateBps)
    .times(100)
    .toNumber()

  const slippageTolerancePercentage = slippageTolerancePercentageDecimal
    ? bnOrZero(slippageTolerancePercentageDecimal).times(100).toNumber()
    : bnOrZero(getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Portals))
        .times(100)
        .toNumber()

  return { affiliateBpsPercentage, slippageTolerancePercentage }
}

// The same-chain Portals router; undefined for supported chains without a known router (cross-chain uses the route target instead)
export const getPortalsRouterAddressByChainId = (
  chainId: PortalsSupportedChainId,
): string | undefined => {
  switch (chainId) {
    case polygonChainId:
      return '0xC74063fdb47fe6dCE6d029A489BAb37b167Da57f'
    case ethChainId:
      return '0xbf5a7f3629fb325e2a8453d595ab103465f75e62'
    case avalancheChainId:
      return '0xbf5A7F3629fB325E2a8453D595AB103465F75E62'
    case binanceChainId:
      return '0x34b6a821d2f26c6b7cdb01cd91895170c6574a0d'
    case optimismChainId:
      return '0x43838f0c0d499f5c3101589f0f452b1fc7515178'
    case arbitrumChainId:
      return '0x34b6a821d2f26c6b7cdb01cd91895170c6574a0d'
    case baseChainId:
    case sonicChainId:
    case plasmaChainId:
      return '0xb0324286b3ef7dddc93fb2ff7c8b7b8a3524803c'
    case hyperEvmChainId:
      return '0x2db3b92918ece265c7d5d9d975c69d89b8b1136c'
    default:
      return undefined
  }
}
