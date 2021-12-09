import { configureStore } from '@reduxjs/toolkit'

import { reducer } from './reducer'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'

export const store = configureStore({
  reducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(portfolioApi.middleware),
  devTools: true
})
