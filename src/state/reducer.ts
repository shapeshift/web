import { combineReducers } from '@reduxjs/toolkit'

import { assets } from './slices/assetsSlice/assetsSlice'

export const reducer = combineReducers({
  assets: assets.reducer
})

export type ReduxState = ReturnType<typeof reducer>
