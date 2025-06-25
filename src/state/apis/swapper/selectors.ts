import { QueryStatus } from '@reduxjs/toolkit/query'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'

import type { ApiQuote, TradeQuoteOrRateRequest } from './types'

import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'

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

export enum QueryStatusExtended {
  uninitialized = QueryStatus.uninitialized,
  pending = QueryStatus.pending,
  rejected = QueryStatus.rejected,
  fulfilledWithQuote = 'fulfilled-with-quote',
  fulfilledNoQuote = 'fulfilled-no-quote',
}

export const selectTradeQuoteSwapperToQueryStatus = createDeepEqualOutputSelector(
  selectSwapperApiQueries,
  queries => {
    const swapperNameToQueryStatus: PartialRecord<SwapperName, QueryStatusExtended> = {}
    const latestTimestamps: PartialRecord<SwapperName, number> = {}

    for (const [queryKey, queryInfo] of Object.entries(queries)) {
      if (!queryKey.startsWith('getTradeQuote')) continue

      const swapperName = (queryInfo?.originalArgs as TradeQuoteOrRateRequest | undefined)
        ?.swapperName

      if (!swapperName) continue

      const startedTimeStamp = queryInfo?.startedTimeStamp ?? 0
      const latestTimestamp = latestTimestamps[swapperName]
      const isMostRecent = !latestTimestamp || startedTimeStamp > latestTimestamp

      const status: QueryStatusExtended | undefined =
        (queryInfo?.status as QueryStatus | undefined) === QueryStatus.fulfilled
          ? (queryInfo?.data?.[swapperName] as ApiQuote | undefined)?.quote !== undefined
            ? QueryStatusExtended.fulfilledWithQuote
            : QueryStatusExtended.fulfilledNoQuote
          : (queryInfo?.status as QueryStatusExtended | undefined)

      if (isMostRecent) {
        latestTimestamps[swapperName] = startedTimeStamp
        swapperNameToQueryStatus[swapperName] = status
      }
    }

    return swapperNameToQueryStatus
  },
)
