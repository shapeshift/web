import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  btcChainId,
  CHAIN_REFERENCE,
  fromChainId,
  solanaChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'

import {
  DEFAULT_RELAY_EVM_TOKEN_ADDRESS,
  RELAY_BTC_TOKEN_ADDRESS,
  RELAY_SOLANA_TOKEN_ADDRESS,
  relayChainIdToChainId,
} from '../constant'
import type { RelayToken } from './types'

export const relayTokenToAssetId = (relayToken: RelayToken): AssetId => {
  const chainId = relayChainIdToChainId[relayToken.chainId]
  const { chainReference } = fromChainId(chainId)

  const isNativeAsset = (() => {
    if (isEvmChainId(chainId)) {
      return relayToken.address === DEFAULT_RELAY_EVM_TOKEN_ADDRESS
    }

    if (chainId === btcChainId) {
      return relayToken.address === RELAY_BTC_TOKEN_ADDRESS
    }

    if (chainId === solanaChainId) {
      return relayToken.address === RELAY_SOLANA_TOKEN_ADDRESS
    }

    return false
  })()

  const { assetReference, assetNamespace } = (() => {
    if (!isNativeAsset) {
      const assetNamespace = (() => {
        switch (true) {
          case isEvmChainId(chainId):
            return ASSET_NAMESPACE.erc20
          case CHAIN_REFERENCE.SolanaMainnet === chainReference:
            return ASSET_NAMESPACE.splToken
          default:
            throw Error(`chainReference '${chainReference}' not supported`)
        }
      })()

      return {
        assetReference: relayToken.address,
        assetNamespace,
      }
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
      case CHAIN_REFERENCE.BitcoinMainnet:
        return {
          assetReference: ASSET_REFERENCE.Bitcoin,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case CHAIN_REFERENCE.SolanaMainnet:
        return {
          assetReference: ASSET_REFERENCE.Solana,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      default:
        throw Error(`chainId '${relayToken.chainId}' not supported`)
    }
  })()

  return toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
}
