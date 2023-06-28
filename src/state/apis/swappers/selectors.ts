import { createSelector } from '@reduxjs/toolkit'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { Selector } from 'reselect'
import type { ApiQuote } from 'state/apis/swappers/types'
import type { ReduxState } from 'state/reducer'

export const selectMostRecentTradeQuoteQuery = (state: ReduxState) => {
  const getTradeQuoteQueries = Object.values(state.swappersApi.queries).filter(
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
}

export const selectSwappersApiTradeQuotes: Selector<ReduxState, ApiQuote[]> = createSelector(
  selectMostRecentTradeQuoteQuery,
  query => (query?.data ?? []) as ApiQuote[],
)

export const selectSwappersApiTradeQuotePending = createSelector(
  selectMostRecentTradeQuoteQuery,
  query => query?.status === QueryStatus.pending,
)
