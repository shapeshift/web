import { configureStore } from '@reduxjs/toolkit'

import { assetMiddleware } from './middlewares/assetsMiddleware'
import { reducer } from './reducer'

export const store = configureStore({
  reducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(assetMiddleware),
  devTools: true
})
