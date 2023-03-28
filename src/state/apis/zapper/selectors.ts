import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

export const selectZapperApiFullfilled = (state: ReduxState) =>
  Object.values(state.zapperApi.queries).filter(query => query?.status === QueryStatus.fulfilled)
