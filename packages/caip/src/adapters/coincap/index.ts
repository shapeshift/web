import toLower from 'lodash/toLower'

import * as adapters from './generated'

export const coincapUrl = 'https://api.coincap.io/v2/assets?limit=2000'

const generatedCAIP19ToCoinCapMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedCoinCapToCAIP19Map: Record<string, string> = invert(generatedCAIP19ToCoinCapMap)

export const coincapToCAIP19 = (id: string): string => {
  const generated = generatedCoinCapToCAIP19Map[id]
  if (!generated) {
    throw new Error(`coincapToCAIP19: no caip19 found for id ${id}`)
  }
  return generated
}

export const CAIP19ToCoinCap = (caip19: string): string => {
  const generated = generatedCAIP19ToCoinCapMap[toLower(caip19)]
  if (!generated) {
    throw new Error(`CAIP19ToCoinCap: no id found for caip19 ${toLower(caip19)}`)
  }
  return generated
}
