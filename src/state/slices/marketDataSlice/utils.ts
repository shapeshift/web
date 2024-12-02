import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, HistoryTimeframe, PartialRecord } from '@shapeshiftoss/types'
import { getHistoryTimeframeBounds } from '@shapeshiftoss/utils'
import dayjs from 'dayjs'
import { merge } from 'lodash'
import type { SupportedFiatCurrencies } from 'lib/market-service'

import type { PriceHistoryByTimeframe } from './types'

export const getTrimmedOutOfBoundsMarketData = <T extends SupportedFiatCurrencies | AssetId>(
  priceHistory: PriceHistoryByTimeframe<T>,
  timeframe: HistoryTimeframe,
  ids: T[],
) => {
  const timeFrameData = priceHistory[timeframe]
  if (!timeFrameData) return

  const { start, end } = getHistoryTimeframeBounds(timeframe, dayjs())

  const startTimeStampMillis = start.valueOf()
  const endTimeStampMillis = end.valueOf()

  const results: PartialRecord<T, HistoryData[]> = {}

  for (const id of ids) {
    const idHistory = timeFrameData[id]
    if (!idHistory) continue
    results[id] = idHistory.filter(
      ({ date }) => date >= startTimeStampMillis && date <= endTimeStampMillis,
    )
  }

  return results
}

export const trimOutOfBoundsMarketData = <T extends SupportedFiatCurrencies | AssetId>(
  priceHistory: PriceHistoryByTimeframe<T>,
  timeframe: HistoryTimeframe,
  ids: T[],
) => {
  const trimmedTimeframeMarketData = getTrimmedOutOfBoundsMarketData(priceHistory, timeframe, ids)

  if (!trimmedTimeframeMarketData) return priceHistory

  return merge(priceHistory[timeframe], trimmedTimeframeMarketData)
}
