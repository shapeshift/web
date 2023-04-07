import { autoBatchEnhancer, configureStore } from '@reduxjs/toolkit'
import { getConfig } from 'config'
import localforage from 'localforage'
import type { TypedUseSelectorHook } from 'react-redux'
import { useDispatch, useSelector } from 'react-redux'
import { createMigrate, PERSIST, persistReducer, persistStore, PURGE } from 'redux-persist'
import { getStateWith, registerSelectors } from 'reselect-tools'
import { swapperApi } from 'state/apis/swapper/swapperApi'

import { abiApi } from './apis/abi/abiApi'
import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import { zapperApi } from './apis/zapper/zapperApi'
import { zerionApi } from './apis/zerion/zerionApi'
import { migrations } from './migrations'
import type { ReduxState } from './reducer'
import { apiSlices, reducer, slices } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketApi, marketData } from './slices/marketDataSlice/marketDataSlice'
import { opportunitiesApi } from './slices/opportunitiesSlice/opportunitiesSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import * as selectors from './slices/selectors'
import { txHistoryApi } from './slices/txHistorySlice/txHistorySlice'
import { updateWindowStoreMiddleware } from './windowMiddleware'

const persistConfig = {
  key: 'root',
  version: 1,
  whitelist: ['txHistory', 'portfolio', 'opportunities'],
  storage: localforage,
  // @ts-ignore createMigrate typings are wrong
  migrate: createMigrate(migrations, { debug: false }),
}

const apiMiddleware = [
  portfolioApi.middleware,
  marketApi.middleware,
  assetApi.middleware,
  txHistoryApi.middleware,
  foxyApi.middleware,
  swapperApi.middleware,
  fiatRampApi.middleware,
  zapperApi.middleware,
  opportunitiesApi.middleware,
  abiApi.middleware,
  zerionApi.middleware,
]

const persistedReducer = persistReducer(persistConfig, reducer)

export const clearState = () => {
  store.dispatch(slices.assets.actions.clear())
  store.dispatch(slices.marketData.actions.clear())
  store.dispatch(slices.txHistory.actions.clear())
  store.dispatch(slices.portfolio.actions.clear())
  store.dispatch(slices.opportunities.actions.clear())

  store.dispatch(apiSlices.assetApi.util.resetApiState())
  store.dispatch(apiSlices.marketApi.util.resetApiState())
  store.dispatch(apiSlices.portfolioApi.util.resetApiState())
  store.dispatch(apiSlices.txHistoryApi.util.resetApiState())
  store.dispatch(apiSlices.opportunitiesApi.util.resetApiState())
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
    enhancers: existingEnhancers => {
      // Add the autobatch enhancer to the store setup
      return existingEnhancers.concat(autoBatchEnhancer())
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        immutableCheck: {
          warnAfter: 128,
          ignoredActions: [PERSIST, PURGE],
        },
        serializableCheck: {
          ignoreState: true,
          ignoreActions: true,
          warnAfter: 128,
          ignoredActions: [PERSIST, PURGE],
        },
      })
        .concat(apiMiddleware)
        .concat(getConfig().REACT_APP_REDUX_WINDOW ? [updateWindowStoreMiddleware] : []),
    devTools: {
      actionSanitizer,
      stateSanitizer,
    },
  })

export const store = createStore()
export const persistor = persistStore(store)

export type ReduxStore = typeof store

// dev QoL to access the store in the console
if (window && getConfig().REACT_APP_REDUX_WINDOW) window.store = store

getStateWith(store.getState)
registerSelectors(selectors)

export const useAppSelector: TypedUseSelectorHook<ReduxState> = useSelector

// https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
