import { autoBatchEnhancer, configureStore } from '@reduxjs/toolkit'
import { getConfig } from 'config'
import type { TypedUseSelectorHook } from 'react-redux'
import { useDispatch, useSelector } from 'react-redux'
import { persistStore } from 'redux-persist'
import { getStateWith, registerSelectors } from 'reselect-tools'

import { abiApi } from './apis/abi/abiApi'
import { covalentApi } from './apis/covalent/covalentApi'
import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import { nftApi } from './apis/nft/nftApi'
import { snapshotApi } from './apis/snapshot/snapshot'
import { swapperApi } from './apis/swapper/swapperApi'
import { zapper, zapperApi } from './apis/zapper/zapperApi'
import type { ReduxState } from './reducer'
import { apiSlices, reducer, slices } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketApi, marketData } from './slices/marketDataSlice/marketDataSlice'
import { opportunitiesApi } from './slices/opportunitiesSlice/opportunitiesApiSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import * as selectors from './slices/selectors'
import { txHistoryApi } from './slices/txHistorySlice/txHistorySlice'
import { createSubscriptionMiddleware } from './subscriptionMiddleware'
import { updateWindowStoreMiddleware } from './windowMiddleware'

const apiMiddleware = [
  portfolioApi.middleware,
  marketApi.middleware,
  assetApi.middleware,
  txHistoryApi.middleware,
  foxyApi.middleware,
  swapperApi.middleware,
  fiatRampApi.middleware,
  snapshotApi.middleware,
  zapper.middleware,
  zapperApi.middleware,
  nftApi.middleware,
  covalentApi.middleware,
  opportunitiesApi.middleware,
  abiApi.middleware,
]

const subscriptionMiddleware = createSubscriptionMiddleware()

export const clearState = () => {
  store.dispatch(slices.assets.actions.clear())
  store.dispatch(slices.marketData.actions.clear())
  store.dispatch(slices.txHistory.actions.clear())
  store.dispatch(slices.portfolio.actions.clear())
  store.dispatch(slices.opportunities.actions.clear())
  store.dispatch(slices.tradeInput.actions.clear())
  store.dispatch(slices.localWalletSlice.actions.clear())

  store.dispatch(apiSlices.assetApi.util.resetApiState())
  store.dispatch(apiSlices.marketApi.util.resetApiState())
  store.dispatch(apiSlices.portfolioApi.util.resetApiState())
  store.dispatch(apiSlices.txHistoryApi.util.resetApiState())
  store.dispatch(apiSlices.opportunitiesApi.util.resetApiState())
  store.dispatch(apiSlices.zapperApi.util.resetApiState())
  store.dispatch(apiSlices.nftApi.util.resetApiState())
  store.dispatch(apiSlices.covalentApi.util.resetApiState())
  store.dispatch(apiSlices.zapper.util.resetApiState())
  store.dispatch(apiSlices.swappersApi.util.resetApiState())
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
    'zapperApi/executeQuery/fulfilled',
    'nftApi/executeQuery/fulfilled',
    'covalentApi/executeQuery/fulfilled',
    'zapper/executeQuery/fulfilled',
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
    reducer,
    enhancers: existingEnhancers => {
      // Add the autobatch enhancer to the store setup
      return existingEnhancers.concat(autoBatchEnhancer())
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        // funnily enough, the checks that should check for perf. issues are actually slowing down the app
        // This is actually safe, since we're not derps mutating the state directly and are using actions and immer for extra safety
        // https://github.com/reduxjs/redux-toolkit/issues/415
        immutableCheck: false,
        serializableCheck: false,
        thunk: {
          extraArgument: { subscribe: subscriptionMiddleware.subscribe },
        },
      })
        .concat(apiMiddleware)
        .concat(subscriptionMiddleware.middleware)
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
