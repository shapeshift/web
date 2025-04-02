import type { AssetId, ChainReference } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  toAssetId,
  toChainId,
} from '@shapeshiftoss/caip'

import { DEFAULT_RELAY_EVM_TOKEN_ADDRESS } from '../constant'
import type { RelayToken } from './types'

export const relayTokenToAssetId = (relayToken: RelayToken): AssetId => {
  const chainReference = relayToken.chainId.toString() as ChainReference
  const chainId = toChainId({
    chainNamespace: CHAIN_NAMESPACE.Evm,
    chainReference,
  })

  // @TODO: Handle the same for Solana and BTC
  const isDefaultAddress = relayToken.address === DEFAULT_RELAY_EVM_TOKEN_ADDRESS

  const { assetReference, assetNamespace } = (() => {
    // @TODO: Handle the same for Solana and BTC
    if (!isDefaultAddress)
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
