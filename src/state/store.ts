import { configureStore } from '@reduxjs/toolkit'

import { reducer } from './reducer'

export const store = configureStore({
  reducer,
  devTools: true,
  middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false })
})
