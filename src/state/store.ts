import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { registerSelectors } from 'reselect-tools'

import { reducer, ReduxState } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketApi } from './slices/marketDataSlice/marketDataSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import * as portfolioSelectors from './slices/portfolioSlice/selectors'

registerSelectors(portfolioSelectors)

const apiMiddleware = [portfolioApi.middleware, marketApi.middleware, assetApi.middleware]

/// This allows us to create an empty store for tests
export const createStore = () =>
  configureStore({
    reducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        immutableCheck: { warnAfter: 128 },
        serializableCheck: { warnAfter: 128 }
      }).concat(apiMiddleware),
    devTools: true
  })

export const store = createStore()

export const useAppSelector: TypedUseSelectorHook<ReduxState> = useSelector

// https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
