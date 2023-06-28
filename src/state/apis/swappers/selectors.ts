import { createSelector } from '@reduxjs/toolkit'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

const _selectMostRecentTradeQuoteQuery = (state: ReduxState) =>
  Object.values(state.swappersApi.queries)
    .filter(query => query?.endpointName === 'getTradeQuote')
    .reduce((mostRecentQuery, query) =>
      query?.startedTimeStamp &&
      mostRecentQuery?.startedTimeStamp &&
      query?.startedTimeStamp > mostRecentQuery?.startedTimeStamp
        ? query
        : mostRecentQuery,
    )

export const selectSwappersApiTradeQuotePending = createSelector(
  _selectMostRecentTradeQuoteQuery,
  query => query?.status === QueryStatus.pending,
)
