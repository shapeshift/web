import { configureStore } from '@reduxjs/toolkit'
import localforage from 'localforage'
import type { TypedUseSelectorHook } from 'react-redux'
import { useDispatch, useSelector } from 'react-redux'
import { PERSIST, persistReducer, persistStore } from 'redux-persist'
import { getStateWith, registerSelectors } from 'reselect-tools'
import { swapperApi } from 'state/apis/swapper/swapperApi'

import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import type { ReduxState } from './reducer'
import { apiSlices, reducer, slices } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketApi, marketData } from './slices/marketDataSlice/marketDataSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import * as selectors from './slices/selectors'
import { txHistoryApi } from './slices/txHistorySlice/txHistorySlice'
import { validatorDataApi } from './slices/validatorDataSlice/validatorDataSlice'

const persistConfig = {
  key: 'root',
  whitelist: [''],
  storage: localforage,
}

const apiMiddleware = [
  portfolioApi.middleware,
  marketApi.middleware,
  assetApi.middleware,
  txHistoryApi.middleware,
  validatorDataApi.middleware,
  foxyApi.middleware,
  swapperApi.middleware,
  fiatRampApi.middleware,
]

const persistedReducer = persistReducer(persistConfig, reducer)

export const clearState = () => {
  store.dispatch(slices.assets.actions.clear())
  store.dispatch(slices.marketData.actions.clear())
  store.dispatch(slices.txHistory.actions.clear())
  store.dispatch(slices.validatorData.actions.clear())
  store.dispatch(slices.portfolio.actions.clear())
  store.dispatch(slices.accountSpecifiers.actions.clear())

  store.dispatch(apiSlices.assetApi.util.resetApiState())
  store.dispatch(apiSlices.marketApi.util.resetApiState())
  store.dispatch(apiSlices.portfolioApi.util.resetApiState())
  store.dispatch(apiSlices.txHistoryApi.util.resetApiState())
  store.dispatch(apiSlices.validatorDataApi.util.resetApiState())
}

/**
 * These actions make the redux devtools crash. Blacklist them from the developer tools.
 * remove the blacklist for local debugging, but don't commit it
 */
const actionSanitizer = (action: any) => {
  const marketDataBlackList = Object.keys(marketData.actions).reduce<string[]>((acc, k) => {
    if (k.startsWith('set')) acc.push(`marketData/${k}`)
    return acc
  }, [])

  const blackList = [
    // our normalized data actions
    'asset/setAssets',
    ...marketDataBlackList,
    // RTK query internal actions
    'assetApi/executeQuery/fulfilled',
    'marketApi/executeQuery/fulfilled',
    'txHistoryApi/executeQuery/fulfilled',
  ]
  return blackList.includes(action.type)
    ? {
        ...action,
        payload: 'see actionSanitizer in store.ts',
      }
    : action
}

/**
 * Remove data from state to improve developer tools experience
 */
const stateSanitizer = (state: any) => {
  // typing state here gives a circular dependency
  const msg = 'see stateSanitizer in store.ts'
  return {
    ...state,
    assets: msg,
    marketData: msg,
    assetApi: msg,
    marketApi: msg,
  }
}

/// This allows us to create an empty store for tests
export const createStore = () =>
  configureStore({
    reducer: persistedReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        immutableCheck: {
          warnAfter: 128,
          ignoredActions: [PERSIST],
        },
        serializableCheck: {
          warnAfter: 128,
          ignoredActions: [PERSIST],
        },
      }).concat(apiMiddleware),
    devTools: {
      actionSanitizer,
      stateSanitizer,
    },
  })

export const store = createStore()
export const persistor = persistStore(store)

getStateWith(store.getState)
registerSelectors(selectors)

export const useAppSelector: TypedUseSelectorHook<ReduxState> = useSelector

// https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
