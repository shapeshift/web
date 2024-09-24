import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { ReduxState } from 'state/reducer'
import type { Portfolio } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { initialState } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export const clearPortfolio = (state: ReduxState): ReduxState => {
  return {
    ...state,
    portfolio: initialState as Portfolio & PersistPartial,
    // This is very ugly but also very correct
    // Typically, to achieve this, we would dispatch nftapi.util.resetApiState as a side effect
    // But we can't do this here because circular deps, so we have to do it manually
    // https://redux-toolkit.js.org/rtk-query/api/created-api/api-slice-utils#resetapistate
    portfolioApi: {
      queries: {},
      mutations: {},
      provided: {},
      subscriptions: {},
      config: {
        online: true,
        focused: true,
        middlewareRegistered: true,
        refetchOnFocus: false,
        refetchOnReconnect: true,
        refetchOnMountOrArgChange: false,
        keepUnusedDataFor: 60,
        reducerPath: 'portfolioApi',
      },
    },
  }
}
