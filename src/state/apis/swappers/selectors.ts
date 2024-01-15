import type { Selector } from '@reduxjs/toolkit'
import { createSelector } from '@reduxjs/toolkit'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import type { ApiQuote, ErrorWithMeta, TradeQuoteRequestError, TradeQuoteResponse } from './types'

const selectSwappersApi = (state: ReduxState) => state.swappersApi

const selectMostRecentTradeQuoteQuery = createDeepEqualOutputSelector(
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
  query => (query?.data as TradeQuoteResponse)?.quotes ?? [],
)

export const selectTradeQuoteRequestErrors: Selector<
  ReduxState,
  ErrorWithMeta<TradeQuoteRequestError>[]
> = createSelector(
  selectMostRecentTradeQuoteQuery,
  query => (query?.data as TradeQuoteResponse)?.errors ?? [],
)

export const selectTradeQuoteRequestFailed: Selector<ReduxState, boolean> = createSelector(
  selectMostRecentTradeQuoteQuery,
  selectTradeQuoteRequestErrors,
  (query, tradeQuoteRequestErrors) => !!query?.error || tradeQuoteRequestErrors.length > 0,
)

export const selectSwappersApiTradeQuotePending = createSelector(
  selectMostRecentTradeQuoteQuery,
  query => query?.status === QueryStatus.pending,
)
