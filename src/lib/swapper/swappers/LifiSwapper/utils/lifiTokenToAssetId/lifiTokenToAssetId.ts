import type { Token } from '@lifi/sdk'
import type { AssetId, ChainReference } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  toAssetId,
  toChainId,
} from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from 'lib/swapper/api'

import { DEFAULT_LIFI_TOKEN_ADDRESS } from '../constants'

export const lifiTokenToAssetId = (lifiToken: Token): AssetId => {
  const chainId = toChainId({
    chainNamespace: CHAIN_NAMESPACE.Evm,
    chainReference: lifiToken.chainId.toString() as ChainReference,
  })

  const isDefaultAddress = lifiToken.address === DEFAULT_LIFI_TOKEN_ADDRESS

  const { assetReference, assetNamespace } = (() => {
    if (!isDefaultAddress)
      return { assetReference: lifiToken.address, assetNamespace: ASSET_NAMESPACE.erc20 }
    switch (lifiToken.chainId.toString()) {
      case CHAIN_REFERENCE.EthereumMainnet:
        return {
          assetReference: ASSET_REFERENCE.Ethereum,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case CHAIN_REFERENCE.AvalancheCChain:
        return {
          assetReference: ASSET_REFERENCE.AvalancheC,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case CHAIN_REFERENCE.OptimismMainnet:
        return {
          assetReference: ASSET_REFERENCE.Optimism,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case CHAIN_REFERENCE.BnbSmartChainMainnet:
        return {
          assetReference: ASSET_REFERENCE.BnbSmartChain,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case CHAIN_REFERENCE.PolygonMainnet:
        return {
          assetReference: ASSET_REFERENCE.Polygon,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case CHAIN_REFERENCE.GnosisMainnet:
        return {
          assetReference: ASSET_REFERENCE.Gnosis,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      default:
        throw new SwapError(`[lifiTokenToAssetId] chainId '${lifiToken.chainId}' not supported`, {
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        })
    }
  })()

  return toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
}
