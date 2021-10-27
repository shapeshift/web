import { combineReducers } from '@reduxjs/toolkit'

import { assets } from './slices/assetsSlice/assetsSlice'
import { txHistory } from './slices/txHistorySlice/txHistorySlice'

export const reducer = combineReducers({
  assets: assets.reducer,
  txHistory: txHistory.reducer
})

export type ReduxState = ReturnType<typeof reducer>
