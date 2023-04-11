import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

export const selectSwapperApiPending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(query => query?.status === QueryStatus.pending)

export const selectSwapperApiTradeQuotePending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getTradeQuote' && query?.status === QueryStatus.pending,
  )

export const selectSwapperApiUsdRatesPending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getUsdRates' && query?.status === QueryStatus.pending,
  )

export const selectSwapperApiTradingActivePending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getIsTradingActive' && query?.status === QueryStatus.pending,
  )

export const selectSwapperQueriesInitiated = (state: ReduxState) =>
  Object.keys(state.swapperApi.queries).length

export const selectAvailableSwapperApiMostRecentQueryTimestamp = (state: ReduxState) => {
  const queries = Object.values(state.swapperApi.queries).filter(
    query => query?.endpointName === 'getAvailableSwappers',
  )

  if (queries.length === 0) {
    return null
  }

  const startedTimeStamps = queries.map(query => query?.startedTimeStamp).filter(Boolean)

  return startedTimeStamps.length > 0 ? Math.max(...startedTimeStamps) : null
}
