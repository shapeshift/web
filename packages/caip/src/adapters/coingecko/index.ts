import toLower from 'lodash/toLower'

import * as adapters from './generated'

export const coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'

const generatedCAIP19ToCoingeckoMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedCoingeckoToCAIP19Map: Record<string, string> = invert(generatedCAIP19ToCoingeckoMap)

export const coingeckoToCAIP19 = (id: string): string | undefined =>
  generatedCoingeckoToCAIP19Map[id]

export const CAIP19ToCoingecko = (caip19: string): string | undefined =>
  generatedCAIP19ToCoingeckoMap[toLower(caip19)]
