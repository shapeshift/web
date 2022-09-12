import invertBy from 'lodash/invertBy'
import toLower from 'lodash/toLower'

import { AssetId, fromAssetId } from '../../assetId/assetId'
import { ChainId, fromChainId, toChainId } from '../../chainId/chainId'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'
import * as adapters from './generated'

// https://api.coingecko.com/api/v3/asset_platforms
export enum CoingeckoAssetPlatform {
  Ethereum = 'ethereum',
  Cosmos = 'cosmos',
  Osmosis = 'osmosis',
  Avalanche = 'avalanche',
  Thorchain = 'thorchain',
}

type CoinGeckoId = string

export const coingeckoBaseUrl = 'https://api.coingecko.com/api/v3'
export const coingeckoProBaseUrl = 'https://pro-api.coingecko.com/api/v3'
export const coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'

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
  generatedAssetIdToCoingeckoMap[toLower(assetId)]

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
        default:
          throw new Error(
            `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`,
          )
      }
    case CHAIN_NAMESPACE.CosmosSdk:
      switch (chainReference) {
        case CHAIN_REFERENCE.CosmosHubMainnet:
          return CoingeckoAssetPlatform.Cosmos
        case CHAIN_REFERENCE.OsmosisMainnet:
          return CoingeckoAssetPlatform.Osmosis
        case CHAIN_REFERENCE.ThorchainMainnet:
          return CoingeckoAssetPlatform.Thorchain
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

export const makeCoingeckoUrlParts = (
  apiKey?: string,
): { baseUrl: string; maybeApiKeyQueryParam: string } => {
  const baseUrl = apiKey ? coingeckoProBaseUrl : coingeckoBaseUrl
  const maybeApiKeyQueryParam = apiKey ? `&x_cg_pro_api_key=${apiKey}` : ''

  return { baseUrl, maybeApiKeyQueryParam }
}

export const makeCoingeckoAssetUrl = (assetId: AssetId, apiKey?: string): string | undefined => {
  const id = assetIdToCoingecko(assetId)
  if (!id) return

  const { baseUrl, maybeApiKeyQueryParam } = makeCoingeckoUrlParts(apiKey)

  const { chainNamespace, chainReference, assetNamespace, assetReference } = fromAssetId(assetId)

  if (assetNamespace === 'erc20') {
    const assetPlatform = chainIdToCoingeckoAssetPlatform(
      toChainId({ chainNamespace, chainReference }),
    )

    return `${baseUrl}/coins/${assetPlatform}/contract/${assetReference}?${maybeApiKeyQueryParam}`
  }

  return `${baseUrl}/coins/${id}?${maybeApiKeyQueryParam}`
}
