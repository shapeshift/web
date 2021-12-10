import { configureStore } from '@reduxjs/toolkit'

import { reducer } from './reducer'
import { marketApi } from './slices/marketDataSlice/marketDataSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'

const apiMiddleware = [portfolioApi.middleware, marketApi.middleware]

export const store = configureStore({
  reducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(apiMiddleware),
  devTools: true
})
