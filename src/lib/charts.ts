import type { HistoryData } from '@keepkey/types'
import sortedIndexBy from 'lodash/sortedIndexBy'

import { bnOrZero } from './bignumber/bignumber'
import { logger } from './logger'

const moduleLogger = logger.child({ namespace: ['charts'] })

type CalculatePercentChange = (data: HistoryData[]) => number

export const calculatePercentChange: CalculatePercentChange = data => {
  const firstPrice = bnOrZero(data?.[0]?.price)
  const lastPrice = bnOrZero(data?.[data.length - 1]?.price)
  return lastPrice.minus(firstPrice).div(firstPrice.abs()).times(100).decimalPlaces(2).toNumber()
}

type PriceAtDateArgs = {
  date: number
  priceHistoryData: HistoryData[]
}

type PriceAtDate = (args: PriceAtDateArgs) => number

export const priceAtDate: PriceAtDate = ({ date, priceHistoryData }): number => {
  const { length } = priceHistoryData
  if (!length) {
    moduleLogger.warn('priceAtDate: no price history data - something will be wrong!')
    return 0
  }
  // https://lodash.com/docs/4.17.15#sortedIndexBy - binary search (O(log n)) rather than O(n)
  const i = sortedIndexBy(priceHistoryData, { date, price: 0 }, ({ date }) => Number(date))
  if (i >= length) return priceHistoryData[length - 1].price
  return priceHistoryData[i].price
}
