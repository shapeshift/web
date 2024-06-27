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

import { DEFAULT_LIFI_TOKEN_ADDRESS } from '../constants'

export const lifiTokenToAssetId = (lifiToken: Token): AssetId => {
  const chainReference = lifiToken.chainId.toString() as ChainReference
  const chainId = toChainId({
    chainNamespace: CHAIN_NAMESPACE.Evm,
    chainReference,
  })

  const isDefaultAddress = lifiToken.address === DEFAULT_LIFI_TOKEN_ADDRESS

  const { assetReference, assetNamespace } = (() => {
    if (!isDefaultAddress)
      return {
        assetReference: lifiToken.address,
        assetNamespace:
          chainReference === CHAIN_REFERENCE.BnbSmartChainMainnet
            ? ASSET_NAMESPACE.bep20
            : ASSET_NAMESPACE.erc20,
      }
    switch (chainReference) {
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
      case CHAIN_REFERENCE.ArbitrumMainnet:
        return {
          assetReference: ASSET_REFERENCE.Arbitrum,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case CHAIN_REFERENCE.BaseMainnet:
        return {
          assetReference: ASSET_REFERENCE.Base,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      default:
        throw Error(`chainId '${lifiToken.chainId}' not supported`)
    }
  })()

  return toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
}
