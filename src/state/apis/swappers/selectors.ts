import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

export const selectSwappersApiTradeQuotePending = (state: ReduxState) =>
  Object.values(state.swappersApi.queries).some(
    query => query?.endpointName === 'getTradeQuote' && query?.status === QueryStatus.pending,
  )
