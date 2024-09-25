import type { PersistPartial } from 'redux-persist/es/persistReducer'
import { initialState } from 'state/slices/marketDataSlice/marketDataSlice'
import type { MarketDataState } from 'state/slices/marketDataSlice/types'

export const clearMarketData = (_state: MarketDataState): MarketDataState & PersistPartial => {
  // Migration to clear marketData state
  return initialState as MarketDataState & PersistPartial
}
