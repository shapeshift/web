import invertBy from 'lodash/invertBy'

import type { AssetId } from '../../assetId/assetId'
import { fromAssetId } from '../../assetId/assetId'
import type { ChainId } from '../../chainId/chainId'
import { fromChainId, toChainId } from '../../chainId/chainId'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'
import * as adapters from './generated'

// https://api.coingecko.com/api/v3/asset_platforms
export enum CoingeckoAssetPlatform {
  Ethereum = 'ethereum',
  Cosmos = 'cosmos',
  Polygon = 'polygon-pos',
  Gnosis = 'xdai',
  Avalanche = 'avalanche',
  Thorchain = 'thorchain',
  Optimism = 'optimistic-ethereum',
  BnbSmartChain = 'binance-smart-chain',
  Arbitrum = 'arbitrum-one',
  ArbitrumNova = 'arbitrum-nova',
  Base = 'base',
  Solana = 'solana',
}

type CoinGeckoId = string

export const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'
export const coingeckoUrl = `${coingeckoBaseUrl}/coins/list?include_platform=true`

const assetIdToCoinGeckoIdMapByChain: Record<AssetId, CoinGeckoId>[] = Object.values(adapters)

const generatedAssetIdToCoingeckoMap = assetIdToCoinGeckoIdMapByChain.reduce((acc, cur) => ({
  ...acc,
  ...cur,
})) as Record<string, string>

const generatedCoingeckoToAssetIdsMap: Record<CoinGeckoId, AssetId[]> = invertBy(
  generatedAssetIdToCoingeckoMap,
)

export const coingeckoToAssetIds = (id: CoinGeckoId): AssetId[] =>
  generatedCoingeckoToAssetIdsMap[id]

export const assetIdToCoingecko = (assetId: AssetId): CoinGeckoId | undefined =>
  generatedAssetIdToCoingeckoMap[assetId]

// https://www.coingecko.com/en/api/documentation - See asset_platforms
export const chainIdToCoingeckoAssetPlatform = (chainId: ChainId): string => {
  const { chainNamespace, chainReference } = fromChainId(chainId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      switch (chainReference) {
        case CHAIN_REFERENCE.EthereumMainnet:
          return CoingeckoAssetPlatform.Ethereum
        case CHAIN_REFERENCE.AvalancheCChain:
          return CoingeckoAssetPlatform.Avalanche
        case CHAIN_REFERENCE.OptimismMainnet:
          return CoingeckoAssetPlatform.Optimism
        case CHAIN_REFERENCE.BnbSmartChainMainnet:
          return CoingeckoAssetPlatform.BnbSmartChain
        case CHAIN_REFERENCE.PolygonMainnet:
          return CoingeckoAssetPlatform.Polygon
        case CHAIN_REFERENCE.GnosisMainnet:
          return CoingeckoAssetPlatform.Gnosis
        case CHAIN_REFERENCE.ArbitrumMainnet:
          return CoingeckoAssetPlatform.Arbitrum
        case CHAIN_REFERENCE.ArbitrumNovaMainnet:
          return CoingeckoAssetPlatform.ArbitrumNova
        case CHAIN_REFERENCE.BaseMainnet:
          return CoingeckoAssetPlatform.Base
        default:
          throw new Error(
            `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`,
          )
      }
    case CHAIN_NAMESPACE.CosmosSdk:
      switch (chainReference) {
        case CHAIN_REFERENCE.CosmosHubMainnet:
          return CoingeckoAssetPlatform.Cosmos
        case CHAIN_REFERENCE.ThorchainMainnet:
          return CoingeckoAssetPlatform.Thorchain
        default:
          throw new Error(
            `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`,
          )
      }
    case CHAIN_NAMESPACE.Solana:
      switch (chainReference) {
        case CHAIN_REFERENCE.SolanaMainnet:
          return CoingeckoAssetPlatform.Solana
        default:
          throw new Error(
            `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`,
          )
      }
    // No valid asset platform: https://api.coingecko.com/api/v3/asset_platforms
    case CHAIN_NAMESPACE.Utxo:
    default:
      throw new Error(`chainNamespace ${chainNamespace} not supported.`)
  }
}

export const makeCoingeckoAssetUrl = (assetId: AssetId): string | undefined => {
  const id = assetIdToCoingecko(assetId)
  if (!id) return

  const { chainNamespace, chainReference, assetNamespace, assetReference } = fromAssetId(assetId)

  if (assetNamespace === 'erc20') {
    const assetPlatform = chainIdToCoingeckoAssetPlatform(
      toChainId({ chainNamespace, chainReference }),
    )

    return `${coingeckoBaseUrl}/coins/${assetPlatform}/contract/${assetReference}`
  }

  return `${coingeckoBaseUrl}/coins/${id}`
}
