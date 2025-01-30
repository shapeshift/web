import { QueryStatus } from '@reduxjs/toolkit/query'
import type { ReduxState } from 'state/reducer'

export const selectPortalsFulfilled = (state: ReduxState) =>
  Object.values(state.portals?.queries ?? {}).filter(
    query => query?.status === QueryStatus.fulfilled,
  )
