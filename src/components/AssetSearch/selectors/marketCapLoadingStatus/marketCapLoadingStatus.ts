import { createSelector } from '@reduxjs/toolkit'
import { ReduxState } from 'state/reducer'

export const marketCapLoadingStatus = createSelector(
  (state: ReduxState) => Object.keys(state.marketData?.marketCap ?? {}).length,
  (state: ReduxState) => state.marketData.loading,
  (loaded, loading) => [loaded, loading]
)
