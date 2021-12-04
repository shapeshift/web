import { combineReducers } from '@reduxjs/toolkit'

import { assets } from './slices/assetsSlice/assetsSlice'
import { marketData } from './slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import { preferences } from './slices/preferencesSlice/preferencesSlice'
import { txHistory } from './slices/txHistorySlice/txHistorySlice'

export const reducer = combineReducers({
  assets: assets.reducer,
  preferences: preferences.reducer,
  marketData: marketData.reducer,
  txHistory: txHistory.reducer,
  portfolio: portfolio.reducer,
  [portfolioApi.reducerPath]: portfolioApi.reducer
})

export type ReduxState = ReturnType<typeof reducer>
