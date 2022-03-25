import { configureStore } from '@reduxjs/toolkit'
import localforage from 'localforage'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { PERSIST, persistReducer, persistStore } from 'redux-persist'
import { registerSelectors } from 'reselect-tools'

import { logging } from './middleware/logging'
import { apiSlices, reducer, ReduxState, slices } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketApi } from './slices/marketDataSlice/marketDataSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import * as portfolioSelectors from './slices/portfolioSlice/selectors'
import { txHistoryApi } from './slices/txHistorySlice/txHistorySlice'

const persistConfig = {
  key: 'root',
  whitelist: [''],
  storage: localforage
}

registerSelectors(portfolioSelectors)

const apiMiddleware = [
  portfolioApi.middleware,
  marketApi.middleware,
  assetApi.middleware,
  txHistoryApi.middleware,
  logging
]

const persistedReducer = persistReducer(persistConfig, reducer)

export const clearState = (opts?: { excludePreferences?: boolean }) => {
  store.dispatch(slices.assets.actions.clear())
  store.dispatch(slices.marketData.actions.clear())
  store.dispatch(slices.txHistory.actions.clear())
  store.dispatch(slices.portfolio.actions.clear())
  store.dispatch(slices.accountSpecifiers.actions.clear())

  store.dispatch(apiSlices.assetApi.util.resetApiState())
  store.dispatch(apiSlices.marketApi.util.resetApiState())
  store.dispatch(apiSlices.portfolioApi.util.resetApiState())
  store.dispatch(apiSlices.txHistoryApi.util.resetApiState())
}

/// This allows us to create an empty store for tests
export const createStore = () =>
  configureStore({
    reducer: persistedReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        immutableCheck: {
          warnAfter: 128,
          ignoredActions: [PERSIST]
        },
        serializableCheck: {
          warnAfter: 128,
          ignoredActions: [PERSIST]
        }
      }).concat(apiMiddleware),
    devTools: true
  })

export const store = createStore()
export const persistor = persistStore(store)

export const useAppSelector: TypedUseSelectorHook<ReduxState> = useSelector

// https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
