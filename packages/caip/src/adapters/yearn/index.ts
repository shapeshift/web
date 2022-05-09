import toLower from 'lodash/toLower'

import * as adapters from './generated'

const generatedAssedIdToYearnMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedYearnToAssetIdMap: Record<string, string> = invert(generatedAssedIdToYearnMap)

export const yearnToAssetId = (id: string): string => generatedYearnToAssetIdMap[id]

export const assetIdToYearn = (assetId: string): string | undefined =>
  generatedAssedIdToYearnMap[toLower(assetId)]
