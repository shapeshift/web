import type { ReduxState } from 'state/reducer'
import { initialState } from 'state/slices/marketDataSlice/marketDataSlice'

export const clearMarketData = (state: ReduxState): ReduxState => {
  // Migration to clear marketData state
  return {
    ...state,
    marketData: initialState,
  }
}
