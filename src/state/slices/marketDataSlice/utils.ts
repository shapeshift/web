import { HistoryData } from '@shapeshiftoss/types'
import sortedIndexBy from 'lodash/sortedIndexBy'

type NormalizePriceHistoryArgs = {
  granular: HistoryData[]
  sparse: HistoryData[]
}

type NormalizePriceHistory = (args: NormalizePriceHistoryArgs) => HistoryData[]
/**
 * motivation:
 * crypto -> usd price history is pretty granular
 * usd -> arbitrary fiat price history granularity is 24 hours
 *
 * this function normalizes the sparse fiat price history dates to the
 * granular crypto price history dates to reduce fiat market data
 * selector complexity from O(n log n) to O(log n)
 */
export const normalizePriceHistory: NormalizePriceHistory = ({ granular, sparse }) => {
  const result = granular.map(({ date }) => {
    const i = sortedIndexBy(sparse, { date, price: 0 }, 'date')
    const targetIndex = i === sparse.length - 1 ? i : i - 1
    return { date, price: sparse[targetIndex].price }
  })
  return result
}
