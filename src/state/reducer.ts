import { combineReducers } from '@reduxjs/toolkit'

import { assets } from './slices/assetsSlice/assetsSlice'
import { preferences } from './slices/preferencesSlice/preferencesSlice'

export const reducer = combineReducers({
  assets: assets.reducer,
  preferences: preferences.reducer
})

export type ReduxState = ReturnType<typeof reducer>
