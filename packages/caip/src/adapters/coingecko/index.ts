import * as adapters from './generated'

export const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'

const generatedCAIP19ToCoingeckoMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedCoingeckoToCAIP19Map: Record<string, string> = invert(generatedCAIP19ToCoingeckoMap)

export const coingeckoToCAIP19 = (id: string): string => {
  const generated = generatedCoingeckoToCAIP19Map[id]
  if (!generated) {
    throw new Error(`coingeckoToCAIP19: no caip19 found for id ${id}`)
  }
  return generated
}

export const CAIP19ToCoingecko = (caip19: string): string => {
  const generated = generatedCAIP19ToCoingeckoMap[caip19]
  if (!generated) {
    throw new Error(`CAIP19ToCoingecko: no id found for caip19 ${caip19}`)
  }
  return generated
}
