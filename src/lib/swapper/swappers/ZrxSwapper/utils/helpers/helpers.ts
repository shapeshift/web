import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { isEvmChainAdapter } from 'lib/utils/evm'

import type { ZrxSupportedChainId } from '../../types'
import { zrxSupportedChainIds } from '../../types'

export const baseUrlFromChainId = (chainId: string): Result<string, SwapErrorRight> => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return Ok('https://api.0x.org/')
    case KnownChainIds.AvalancheMainnet:
      return Ok('https://avalanche.api.0x.org/')
    case KnownChainIds.OptimismMainnet:
      return Ok('https://optimism.api.0x.org/')
    case KnownChainIds.BnbSmartChainMainnet:
      return Ok('https://bsc.api.0x.org/')
    case KnownChainIds.PolygonMainnet:
      return Ok('https://polygon.api.0x.org/')
    default:
      return Err(
        makeSwapErrorRight({
          message: `baseUrlFromChainId] - Unsupported chainId: ${chainId}`,
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        }),
      )
  }
}

// converts an asset to zrx token (symbol or contract address)
export const assetToToken = (asset: Asset): string => {
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)
  return assetNamespace === 'slip44' ? asset.symbol : assetReference
}

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
  receiveAddress,
}: {
  buyAsset: Asset
  sellAsset: Asset
  receiveAddress?: string
}): Result<boolean, SwapErrorRight> => {
  if (!zrxSupportedChainIds.includes(sellAsset.chainId as ZrxSupportedChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[Zrx: assertValidTrade] - unsupported chainId`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[Zrx: assertValidTrade] - both assets must be on chainId ${sellAsset.chainId}`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[Zrx: assertValidTrade] - receive address is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  return Ok(true)
}

export const getAdapter = (
  chainId: ChainId | KnownChainIds,
): Result<EvmChainAdapter, SwapErrorRight> => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: '[Zrx: getAdapter] - invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { chainId },
      }),
    )
  }

  return Ok(adapter)
}
