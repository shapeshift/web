import type { ReduxState } from 'state/reducer'

export const selectSwapperApiPending = (state: ReduxState) =>
  Object.values(state.swapperApi.queries).some(query => query?.status === 'pending')
