import invert from 'lodash/invert'
import toLower from 'lodash/toLower'

import * as adapters from './generated'

const apiKey = '478b07654ff6dd0716b52e63cb2ad27c2b6aa7b7679d56eda0ea250d8b27dfcd'
export const coincapUrl = `https://rest.coincap.io/v3/assets?limit=2000&apiKey=${apiKey}`

const generatedAssetIdToCoinCapMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur,
})) as Record<string, string>

const generatedCoinCapToAssetIdMap: Record<string, string> = invert(generatedAssetIdToCoinCapMap)

export const coincapToAssetId = (id: string): string | undefined => generatedCoinCapToAssetIdMap[id]

export const assetIdToCoinCap = (assetId: string): string | undefined =>
  generatedAssetIdToCoinCapMap[toLower(assetId)]
