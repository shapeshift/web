import * as adapters from './generated'

export const osmosisUrl = 'https://api-osmosis.imperator.co/tokens/v2/all'

const generatedAssetIdToOsmosisMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedOsmosisToAssetIdMap: Record<string, string> = invert(generatedAssetIdToOsmosisMap)

export const osmosisToAssetId = (id: string): string | undefined => generatedOsmosisToAssetIdMap[id]

export const assetIdToOsmosis = (assetId: string): string | undefined =>
  generatedAssetIdToOsmosisMap[assetId]
