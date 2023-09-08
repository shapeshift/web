import invert from 'lodash/invert'
import toLower from 'lodash/toLower'

import * as adapters from './generated'

export const coincapUrl = 'https://api.coincap.io/v2/assets?limit=2000'

const generatedAssetIdToCoinCapMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur,
})) as Record<string, string>

const generatedCoinCapToAssetIdMap: Record<string, string> = invert(generatedAssetIdToCoinCapMap)

export const coincapToAssetId = (id: string): string | undefined => generatedCoinCapToAssetIdMap[id]

export const assetIdToCoinCap = (assetId: string): string | undefined =>
  generatedAssetIdToCoinCapMap[toLower(assetId)]
