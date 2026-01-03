import invertBy from 'lodash/invertBy'
import toLower from 'lodash/toLower'

import * as adapters from './generated'

export const baseUrl = 'https://rest.coincap.io/v3'

export const getCoincapAssetUrl = () => {
  const apiKey = process.env.COINCAP_API_KEY || process.env.VITE_COINCAP_API_KEY || ''
  return `${baseUrl}/assets?limit=2000&apiKey=${apiKey}`
}

export const coincapAssetUrl = getCoincapAssetUrl()

const generatedAssetIdToCoinCapMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur,
})) as Record<string, string>

const generatedCoincapToAssetIdsMap: Record<string, string[]> = invertBy(
  generatedAssetIdToCoinCapMap,
)

export const coincapToAssetIds = (id: string): string[] | undefined =>
  generatedCoincapToAssetIdsMap[id]

export const assetIdToCoinCap = (assetId: string): string | undefined =>
  generatedAssetIdToCoinCapMap[toLower(assetId)]
