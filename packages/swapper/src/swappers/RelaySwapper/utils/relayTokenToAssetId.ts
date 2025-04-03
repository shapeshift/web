import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  CHAIN_REFERENCE,
  fromChainId,
  toAssetId,
} from '@shapeshiftoss/caip'

import {
  chainIdToRelayChainIdMap,
  DEFAULT_RELAY_BTC_TOKEN_ADDRESS,
  DEFAULT_RELAY_EVM_TOKEN_ADDRESS,
  DEFAULT_RELAY_SOLANA_TOKEN_ADDRESS,
} from '../constant'
import type { RelayToken } from './types'

export const relayTokenToAssetId = (relayToken: RelayToken): AssetId => {
  const chainId = chainIdToRelayChainIdMap[relayToken.chainId].toString()
  const chainReference = fromChainId(chainId).chainReference

  const isDefaultAddress = (() => {
    if (relayToken.address === DEFAULT_RELAY_EVM_TOKEN_ADDRESS) return true
    if (relayToken.address === DEFAULT_RELAY_BTC_TOKEN_ADDRESS) return true
    if (relayToken.address === DEFAULT_RELAY_SOLANA_TOKEN_ADDRESS) return true

    return false
  })()

  const { assetReference, assetNamespace } = (() => {
    if (!isDefaultAddress) {
      const assetNamespace = (() => {
        switch (chainReference) {
          case CHAIN_REFERENCE.EthereumMainnet:
            return ASSET_NAMESPACE.erc20
          case CHAIN_REFERENCE.BnbSmartChainMainnet:
            return ASSET_NAMESPACE.bep20
          case CHAIN_REFERENCE.BitcoinMainnet:
            return ASSET_NAMESPACE.slip44
          case CHAIN_REFERENCE.SolanaMainnet:
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
          assetNamespace: ASSET_NAMESPACE.splToken,
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
