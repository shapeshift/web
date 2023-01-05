import { QueryStatus } from '@reduxjs/toolkit/query'
import flatten from 'lodash/flatten'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'

const getSwapperQueries = (state: ReduxState) => {
  const allQueries = [
    state.getUsdRateApi.queries,
    state.getUsdRatesApi.queries,
    state.getTradeQuoteApi.queries,
    state.getBestSwapperApi.queries,
  ]
  return flatten(allQueries.map(apiQueries => Object.values(apiQueries))).filter(isSome)
}

export const selectSwapperApiPending = (state: ReduxState) => {
  const swapperQueries = getSwapperQueries(state)
  return swapperQueries.some(query => query?.status === QueryStatus.pending)
}

export const selectSwapperApiTradeQuotePending = (state: ReduxState) =>
  Object.values(state.getTradeQuoteApi.queries).some(
    query => query?.endpointName === 'getTradeQuote' && query?.status === QueryStatus.pending,
  )

export const selectSwapperApiUsdRatesPending = (state: ReduxState) =>
  Object.values(state.getUsdRatesApi.queries).some(
    query => query?.endpointName === 'getUsdRates' && query?.status === QueryStatus.pending,
  )
