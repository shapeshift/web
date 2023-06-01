import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

export const selectZapperFulfilled = (state: ReduxState) =>
  Object.values(state.zapper.queries).filter(query => query?.status === QueryStatus.fulfilled)
