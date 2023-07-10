import type { Selector } from '@reduxjs/toolkit'
import { createSelector } from '@reduxjs/toolkit'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import type { ApiQuote } from './types'

const selectSwappersApi = (state: ReduxState) => state.swappersApi

export const selectMostRecentTradeQuoteQuery = createDeepEqualOutputSelector(
  selectSwappersApi,
  swappersApi => {
    const getTradeQuoteQueries = Object.values(swappersApi.queries).filter(
      query => query?.endpointName === 'getTradeQuote',
    )

    if (!getTradeQuoteQueries.length) return undefined

    return getTradeQuoteQueries.reduce((mostRecentQuery, query) =>
      query?.startedTimeStamp &&
      mostRecentQuery?.startedTimeStamp &&
      query?.startedTimeStamp > mostRecentQuery?.startedTimeStamp
        ? query
        : mostRecentQuery,
    )
  },
)

export const selectSwappersApiTradeQuotes: Selector<ReduxState, ApiQuote[]> = createSelector(
  selectMostRecentTradeQuoteQuery,
  query => (query?.data ?? []) as ApiQuote[],
)

export const selectSwappersApiTradeQuotePending = createSelector(
  selectMostRecentTradeQuoteQuery,
  query => query?.status === QueryStatus.pending,
)
