import { configureStore } from '@reduxjs/toolkit'
import type { TypedUseSelectorHook } from 'react-redux'
import { useDispatch, useSelector } from 'react-redux'
import { persistStore } from 'redux-persist'
import { setGlobalDevModeChecks } from 'reselect'

import { abiApi } from './apis/abi/abiApi'
import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import { limitOrderApi } from './apis/limit-orders/limitOrderApi'
import { portalsApi } from './apis/portals/portalsApi'
import { snapshotApi } from './apis/snapshot/snapshot'
import { swapperApi } from './apis/swapper/swapperApi'
import type { ReduxState } from './reducer'
import { apiSlices, reducer, slices } from './reducer'
import { assetApi } from './slices/assetsSlice/assetsSlice'
import { marketData } from './slices/marketDataSlice/marketDataSlice'
import { opportunitiesApi } from './slices/opportunitiesSlice/opportunitiesApiSlice'
import { portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import { txHistoryApi } from './slices/txHistorySlice/txHistorySlice'
import { createSubscriptionMiddleware } from './subscriptionMiddleware'
import { updateWindowStoreMiddleware } from './windowMiddleware'

import { getConfig } from '@/config'
import { accountService } from '@/lib/account/accountService'
// reselect pls stfu
// We should probably revisit this at some point and re-enable, but for the time being, this silences things
// https://github.com/reduxjs/reselect/discussions/662#discussioncomment-7870416
setGlobalDevModeChecks({ identityFunctionCheck: 'never' })

const apiMiddleware = [
  portfolioApi.middleware,
  assetApi.middleware,
  txHistoryApi.middleware,
  foxyApi.middleware,
  swapperApi.middleware,
  fiatRampApi.middleware,
  snapshotApi.middleware,
  portalsApi.middleware,
  opportunitiesApi.middleware,
  abiApi.middleware,
  limitOrderApi.middleware,
]

const subscriptionMiddleware = createSubscriptionMiddleware()

export const clearState = () => {
  store.dispatch(slices.assets.actions.clear())
  store.dispatch(slices.marketData.actions.clear())
  store.dispatch(slices.txHistory.actions.clear())
  store.dispatch(slices.portfolio.actions.clear())
  store.dispatch(slices.opportunities.actions.clear())
  store.dispatch(slices.tradeInput.actions.clear())
  store.dispatch(slices.localWallet.actions.clear())
  store.dispatch(slices.limitOrderInput.actions.clear())
  store.dispatch(slices.limitOrder.actions.clear())
  store.dispatch(slices.gridplus.actions.clear())
  store.dispatch(slices.addressBook.actions.clear())

  store.dispatch(apiSlices.assetApi.util.resetApiState())
  store.dispatch(apiSlices.portfolioApi.util.resetApiState())
  store.dispatch(apiSlices.txHistoryApi.util.resetApiState())
  store.dispatch(apiSlices.opportunitiesApi.util.resetApiState())
  store.dispatch(apiSlices.portalsApi.util.resetApiState())
  store.dispatch(apiSlices.swappersApi.util.resetApiState())
  store.dispatch(apiSlices.limitOrderApi.util.resetApiState())

  accountService.clearCache()
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
    'txHistoryApi/executeQuery/fulfilled',
    'portalsApi/executeQuery/fulfilled',
    'portals/executeQuery/fulfilled',
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
  }
}

/// This allows us to create an empty store for tests
export const createStore = () =>
  configureStore({
    reducer,
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
        .concat(getConfig().VITE_REDUX_WINDOW ? [updateWindowStoreMiddleware] : []),
    devTools: {
      actionSanitizer,
      stateSanitizer,
    },
  })

export const store = createStore()
export const persistor = persistStore(store)

// dev QoL to access the store in the console
if (window && getConfig().VITE_REDUX_WINDOW) window.store = store

export const useAppSelector: TypedUseSelectorHook<ReduxState> = useSelector
export const useSelectorWithArgs = <Args extends unknown[], TSelected>(
  selector: (state: ReduxState, ...args: Args) => TSelected,
  ...args: Args
) => useAppSelector(state => selector(state, ...args))

// https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
