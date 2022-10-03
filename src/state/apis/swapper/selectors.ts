import type { ReduxState } from 'state/reducer'

export const selectSwapperApiPending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(query => query?.status === 'pending')

export const selectSwapperApiTradeQuotePending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getTradeQuote' && query?.status === 'pending',
  )

export const selectSwapperApiUsdRatesPending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(
    query => query?.endpointName === 'getUsdRates' && query?.status === 'pending',
  )
