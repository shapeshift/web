import type { HistoryData } from '@shapeshiftoss/types'

import { bnOrZero } from './bignumber/bignumber'

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

// interpolation search, because HistoryDate[] is sorted and uniformly distributed
// https://sharegpt.com/c/HmmD91H
export const priceAtDate: PriceAtDate = ({ date, priceHistoryData }): number => {
  const { length } = priceHistoryData
  if (!length) return 0

  let low = 0
  let high = length - 1
  let closest = low

  if (date >= priceHistoryData[high].date) {
    return priceHistoryData[high].price
  }

  while (low <= high && date >= priceHistoryData[low].date && date <= priceHistoryData[high].date) {
    if (low === high) {
      closest = low
      break
    }

    const range = priceHistoryData[high].date - priceHistoryData[low].date
    const offset = ((date - priceHistoryData[low].date) * (high - low)) / range
    const mid = Math.round(low + offset)

    if (priceHistoryData[mid].date === date) {
      closest = mid
      break
    }

    if (
      Math.abs(priceHistoryData[mid].date - date) < Math.abs(priceHistoryData[closest].date - date)
    ) {
      closest = mid
    }

    if (priceHistoryData[mid].date < date) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return priceHistoryData[closest].price
}
