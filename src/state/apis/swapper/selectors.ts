import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import type { TradeQuoteOrRateRequest } from './types'

const selectSwapperApiQueries = (state: ReduxState) => state.swapperApi.queries

export const selectIsTradeQuoteApiQueryPending = createDeepEqualOutputSelector(
  selectSwapperApiQueries,
  queries => {
    const isLoadingBySwapperName: PartialRecord<SwapperName, boolean> = {}
    const latestTimestamps: PartialRecord<SwapperName, number> = {}

    for (const [queryKey, queryInfo] of Object.entries(queries)) {
      if (!queryKey.startsWith('getTradeQuote')) continue

      const swapperName = (queryInfo?.originalArgs as TradeQuoteOrRateRequest | undefined)
        ?.swapperName

      if (!swapperName) continue

      const startedTimeStamp = queryInfo?.startedTimeStamp ?? 0
      const latestTimestamp = latestTimestamps[swapperName]
      const isMostRecent = !latestTimestamp || startedTimeStamp > latestTimestamp

      if (isMostRecent) {
        latestTimestamps[swapperName] = startedTimeStamp
        isLoadingBySwapperName[swapperName] = [
          QueryStatus.uninitialized,
          QueryStatus.pending,
          undefined,
        ].includes(queryInfo?.status)
      }
    }

    return isLoadingBySwapperName
  },
)
