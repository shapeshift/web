import toLower from 'lodash/toLower'

import * as adapters from './generated'

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
