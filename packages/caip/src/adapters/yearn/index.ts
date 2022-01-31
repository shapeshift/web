import toLower from 'lodash/toLower'

import * as adapters from './generated'

const generatedCAIP19ToYearnMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur
})) as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const generatedYearnToCAIP19Map: Record<string, string> = invert(generatedCAIP19ToYearnMap)

export const yearnToCAIP19 = (id: string): string => generatedYearnToCAIP19Map[id]

export const CAIP19ToYearn = (caip19: string): string | undefined =>
  generatedCAIP19ToYearnMap[toLower(caip19)]
