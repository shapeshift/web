import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import type { TradeQuoteRequest } from './types'

const selectSwapperApiQueries = (state: ReduxState) => state.swapperApi.queries

export const selectIsTradeQuoteApiQueryPending = createDeepEqualOutputSelector(
  selectSwapperApiQueries,
  queries => {
    const loadingState: PartialRecord<SwapperName, boolean> = {}
    const latestTimestamps: PartialRecord<SwapperName, number> = {}

    for (const [queryKey, queryInfo] of Object.entries(queries)) {
      if (!queryKey.startsWith('getTradeQuote')) continue

      const swapperName = (queryInfo?.originalArgs as TradeQuoteRequest | undefined)?.swapperName

      if (!swapperName) continue

      const startedTimeStamp = queryInfo?.startedTimeStamp ?? 0
      const latestTimestamp = latestTimestamps[swapperName]
      const isMostRecent = !latestTimestamp || startedTimeStamp > latestTimestamp

      if (isMostRecent) {
        latestTimestamps[swapperName] = startedTimeStamp
        loadingState[swapperName] = queryInfo?.status === QueryStatus.pending
      }
    }

    return loadingState
  },
)
