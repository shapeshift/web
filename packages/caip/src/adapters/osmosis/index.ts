import * as adapters from './generated'

export const osmosisUrl = 'https://api-osmosis.imperator.co/tokens/v2/all'

const generatedCAIP19ToOsmosisMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedOsmosisToCAIP19Map: Record<string, string> = invert(generatedCAIP19ToOsmosisMap)

export const osmosisToCAIP19 = (id: string): string | undefined => generatedOsmosisToCAIP19Map[id]

export const CAIP19ToOsmosis = (caip19: string): string | undefined =>
  generatedCAIP19ToOsmosisMap[caip19]
