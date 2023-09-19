import type { ReduxState } from 'state/reducer'
import { initialState } from 'state/slices/assetsSlice/assetsSlice'

export const clearAssets = (state: ReduxState): ReduxState => {
  return {
    ...state,
    assets: initialState,
    // This is very ugly but also very correct
    // Typically, to achieve this, we would dispatch nftapi.util.resetApiState as a side effect
    // But we can't do this here because circular deps, so we have to do it manually
    // https://redux-toolkit.js.org/rtk-query/api/created-api/api-slice-utils#resetapistate
    assetApi: {
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
        reducerPath: 'assetApi',
      },
    },
  }
}
