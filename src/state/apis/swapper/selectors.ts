import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

export const selectSwapperApiPending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(query => query?.status === QueryStatus.pending)

export const selectSwapperApiTradeQuotePending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getTradeQuote' && query?.status === QueryStatus.pending,
  )

export const selectSwapperApiTradingActivePending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getIsTradingActive' && query?.status === QueryStatus.pending,
  )

export const selectSwapperQueriesInitiated = (state: ReduxState) =>
  Object.keys(state.swapperApi.queries).length
