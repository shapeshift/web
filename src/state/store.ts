import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useSelector } from 'react-redux'

import { reducer, ReduxState } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketApi } from './slices/marketDataSlice/marketDataSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'

const apiMiddleware = [portfolioApi.middleware, marketApi.middleware, assetApi.middleware]

export const store = configureStore({
  reducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      immutableCheck: { warnAfter: 128 },
      serializableCheck: { warnAfter: 128 }
    }).concat(apiMiddleware),
  devTools: true
})

export const useAppSelector: TypedUseSelectorHook<ReduxState> = useSelector
