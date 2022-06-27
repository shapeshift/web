import toLower from 'lodash/toLower'

import { fromAssetId } from '../../assetId/assetId'
import { ChainId, fromChainId, toChainId } from '../../chainId/chainId'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'
import * as adapters from './generated'

// https://api.coingecko.com/api/v3/asset_platforms
export enum CoingeckoAssetPlatform {
  Ethereum = 'ethereum',
  Cosmos = 'cosmos',
  Osmosis = 'osmosis',
  Avalanche = 'avalanche'
}

export const coingeckoBaseUrl = 'https://api.coingecko.com/api/v3'
export const coingeckoProBaseUrl = 'https://pro-api.coingecko.com/api/v3'
export const coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'

const generatedAssetIdToCoingeckoMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedCoingeckoToAssetIdMap: Record<string, string> = invert(
  generatedAssetIdToCoingeckoMap
)

export const coingeckoToAssetId = (id: string): string | undefined =>
  generatedCoingeckoToAssetIdMap[id]

export const assetIdToCoingecko = (assetId: string): string | undefined =>
  generatedAssetIdToCoingeckoMap[toLower(assetId)]

// https://www.coingecko.com/en/api/documentation - See asset_platforms
export const chainIdToCoingeckoAssetPlatform = (chainId: ChainId): string => {
  const { chainNamespace, chainReference } = fromChainId(chainId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Ethereum:
      switch (chainReference) {
        case CHAIN_REFERENCE.EthereumMainnet:
          return CoingeckoAssetPlatform.Ethereum
        case CHAIN_REFERENCE.AvalancheCChain:
          return CoingeckoAssetPlatform.Avalanche
        default:
          throw new Error(
            `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`
          )
      }
    case CHAIN_NAMESPACE.Cosmos:
      switch (chainReference) {
        case CHAIN_REFERENCE.CosmosHubMainnet:
          return CoingeckoAssetPlatform.Cosmos
        case CHAIN_REFERENCE.OsmosisMainnet:
          return CoingeckoAssetPlatform.Osmosis
        default:
          throw new Error(
            `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`
          )
      }
    // Bitcoin is not a valid asset platform: https://api.coingecko.com/api/v3/asset_platforms
    case CHAIN_NAMESPACE.Bitcoin:
    default:
      throw new Error(
        `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`
      )
  }
}

export const makeCoingeckoUrlParts = (
  apiKey?: string
): { baseUrl: string; maybeApiKeyQueryParam: string } => {
  const baseUrl = apiKey ? coingeckoProBaseUrl : coingeckoBaseUrl
  const maybeApiKeyQueryParam = apiKey ? `&x_cg_pro_api_key=${apiKey}` : ''

  return { baseUrl, maybeApiKeyQueryParam }
}

export const makeCoingeckoAssetUrl = (assetId: string, apiKey?: string): string | undefined => {
  const id = assetIdToCoingecko(assetId)
  if (!id) return

  const { baseUrl, maybeApiKeyQueryParam } = makeCoingeckoUrlParts(apiKey)

  const { chainNamespace, chainReference, assetNamespace, assetReference } = fromAssetId(assetId)

  if (assetNamespace === 'erc20') {
    const assetPlatform = chainIdToCoingeckoAssetPlatform(
      toChainId({ chainNamespace, chainReference })
    )

    return `${baseUrl}/coins/${assetPlatform}/contract/${assetReference}?${maybeApiKeyQueryParam}`
  }

  return `${baseUrl}/coins/${id}?${maybeApiKeyQueryParam}`
}
