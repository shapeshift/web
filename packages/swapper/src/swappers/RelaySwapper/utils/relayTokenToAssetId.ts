import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  btcChainId,
  CHAIN_REFERENCE,
  fromChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'

import {
  DEFAULT_RELAY_EVM_TOKEN_ADDRESS,
  RELAY_BTC_TOKEN_ADDRESS,
  relayChainIdToChainId,
} from '../constant'
import type { RelayToken } from './types'

export const relayTokenToAssetId = (relayToken: RelayToken): AssetId => {
  const chainId = relayChainIdToChainId[relayToken.chainId]
  const { chainReference } = fromChainId(chainId)

  // @TODO: Handle the same for Solana
  const isNativeAsset = (() => {
    if (isEvmChainId(chainId)) {
      return relayToken.address === DEFAULT_RELAY_EVM_TOKEN_ADDRESS
    }

    if (chainId === btcChainId) {
      return relayToken.address === RELAY_BTC_TOKEN_ADDRESS
    }

    return false
  })()

  const { assetReference, assetNamespace } = (() => {
    // @TODO: Handle the same for Solana and BTC
    if (!isNativeAsset)
      return {
        assetReference: relayToken.address,
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
