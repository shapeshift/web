import { HistoryData } from '@shapeshiftoss/types'
import isNil from 'lodash/isNil'
import sortedIndexBy from 'lodash/sortedIndexBy'

import { bnOrZero } from './bignumber/bignumber'

type CalculatePercentChange = (data: HistoryData[]) => number

export const calculatePercentChange: CalculatePercentChange = data => {
  const start = data?.[0]?.price
  if (isNil(start)) return 0
  const startBn = bnOrZero(start)
  if (startBn.eq(0)) return Infinity
  return bnOrZero(data?.[data.length - 1]?.price)
    .minus(startBn)
    .div(startBn.abs())
    .times(100)
    .decimalPlaces(2)
    .toNumber()
}

type PriceAtBlockTimeArgs = {
  date: number
  priceHistoryData: HistoryData[]
}

type PriceAtBlockTime = (args: PriceAtBlockTimeArgs) => number

export const priceAtBlockTime: PriceAtBlockTime = ({ date, priceHistoryData }): number => {
  const { length } = priceHistoryData
  // https://lodash.com/docs/4.17.15#sortedIndexBy - binary search rather than O(n)
  const i = sortedIndexBy(priceHistoryData, { date, price: 0 }, ({ date }) => Number(date))
  if (i === 0) return priceHistoryData[i].price
  if (i >= length) return priceHistoryData[length - 1].price
  return priceHistoryData[i].price
}
