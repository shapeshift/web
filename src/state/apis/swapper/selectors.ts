import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

export const selectSwapperApiTradingActivePending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getIsTradingActive' && query?.status === QueryStatus.pending,
  )
