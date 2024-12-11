import type { AssetReference, ChainNamespace, ChainReference } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, CHAIN_NAMESPACE, CHAIN_REFERENCE } from '@shapeshiftoss/caip'

export const getNativeFeeAssetReference = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference,
): AssetReference => {
  return (() => {
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Utxo:
        switch (chainReference) {
          case CHAIN_REFERENCE.BitcoinMainnet:
            return ASSET_REFERENCE.Bitcoin
          case CHAIN_REFERENCE.BitcoinCashMainnet:
            return ASSET_REFERENCE.BitcoinCash
          case CHAIN_REFERENCE.DogecoinMainnet:
            return ASSET_REFERENCE.Dogecoin
          case CHAIN_REFERENCE.LitecoinMainnet:
            return ASSET_REFERENCE.Litecoin
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      case CHAIN_NAMESPACE.Evm:
        switch (chainReference) {
          case CHAIN_REFERENCE.AvalancheCChain:
            return ASSET_REFERENCE.AvalancheC
          case CHAIN_REFERENCE.EthereumMainnet:
            return ASSET_REFERENCE.Ethereum
          case CHAIN_REFERENCE.OptimismMainnet:
            return ASSET_REFERENCE.Optimism
          case CHAIN_REFERENCE.BnbSmartChainMainnet:
            return ASSET_REFERENCE.BnbSmartChain
          case CHAIN_REFERENCE.PolygonMainnet:
            return ASSET_REFERENCE.Polygon
          case CHAIN_REFERENCE.GnosisMainnet:
            return ASSET_REFERENCE.Gnosis
          case CHAIN_REFERENCE.ArbitrumMainnet:
            return ASSET_REFERENCE.Arbitrum
          case CHAIN_REFERENCE.ArbitrumNovaMainnet:
            return ASSET_REFERENCE.ArbitrumNova
          case CHAIN_REFERENCE.BaseMainnet:
            return ASSET_REFERENCE.Base
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      case CHAIN_NAMESPACE.CosmosSdk:
        switch (chainReference) {
          case CHAIN_REFERENCE.CosmosHubMainnet:
            return ASSET_REFERENCE.Cosmos
          case CHAIN_REFERENCE.ThorchainMainnet:
            return ASSET_REFERENCE.Thorchain
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      case CHAIN_NAMESPACE.Solana:
        switch (chainReference) {
          case CHAIN_REFERENCE.SolanaMainnet:
            return ASSET_REFERENCE.Solana
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      default:
        throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
    }
  })()
}
