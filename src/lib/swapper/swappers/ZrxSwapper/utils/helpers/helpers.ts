import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import {
  DAO_TREASURY_AVALANCHE,
  DAO_TREASURY_BSC,
  DAO_TREASURY_ETHEREUM_MAINNET,
  DAO_TREASURY_OPTIMISM,
  DAO_TREASURY_POLYGON,
} from 'constants/treasury'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'

import type { ZrxSupportedChainAdapter } from '../../ZrxSwapper'

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

export const assertValidTradePair = ({
  buyAsset,
  sellAsset,
  adapter,
}: {
  buyAsset: Asset
  sellAsset: Asset
  adapter: ZrxSupportedChainAdapter
}): Result<boolean, SwapErrorRight> => {
  const chainId = adapter.getChainId()

  if (buyAsset.chainId === chainId && sellAsset.chainId === chainId) return Ok(true)

  return Err(
    makeSwapErrorRight({
      message: `[assertValidTradePair] - both assets must be on chainId ${chainId}`,
      code: SwapErrorType.UNSUPPORTED_PAIR,
      details: {
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
      },
    }),
  )
}

export const getTreasuryAddressForReceiveAsset = (assetId: AssetId): string => {
  const chainId = fromAssetId(assetId).chainId
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return DAO_TREASURY_ETHEREUM_MAINNET
    case KnownChainIds.AvalancheMainnet:
      return DAO_TREASURY_AVALANCHE
    case KnownChainIds.OptimismMainnet:
      return DAO_TREASURY_OPTIMISM
    case KnownChainIds.BnbSmartChainMainnet:
      return DAO_TREASURY_BSC
    case KnownChainIds.PolygonMainnet:
      return DAO_TREASURY_POLYGON
    default:
      throw new Error(`[getTreasuryAddressForReceiveAsset] - Unsupported chainId: ${chainId}`)
  }
}
