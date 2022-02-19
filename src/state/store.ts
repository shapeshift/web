import { configureStore } from '@reduxjs/toolkit'
// import localforage from 'localforage'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
// import { PERSIST, persistReducer, persistStore, PURGE } from 'redux-persist'
import { registerSelectors } from 'reselect-tools'

import { reducer, ReduxState } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketApi } from './slices/marketDataSlice/marketDataSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import * as portfolioSelectors from './slices/portfolioSlice/selectors'

// const persistConfig = {
//   key: 'root',
//   storage: localforage
// }

registerSelectors(portfolioSelectors)

const apiMiddleware = [portfolioApi.middleware, marketApi.middleware, assetApi.middleware]

// const persistedReducer = persistReducer(persistConfig, reducer)

/// This allows us to create an empty store for tests
export const createStore = () =>
  configureStore({
    reducer: reducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        immutableCheck: { warnAfter: 128 },
        serializableCheck: {
          warnAfter: 128
          // ignoredActions: [PERSIST, PURGE]
        }
      }).concat(apiMiddleware),
    devTools: true
  })

export const store = createStore()
// export const persistor = persistStore(store)

export const useAppSelector: TypedUseSelectorHook<ReduxState> = useSelector

// https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
