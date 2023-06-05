import { initialState } from 'state/apis/nft/nftApi'
import type { ReduxState } from 'state/reducer'

export const clearNfts = (state: ReduxState): ReduxState => {
  return {
    ...state,
    nft: initialState,
    // This is very ugly but also very correct
    // Typically, to achieve this, we would dispatch nftapi.util.resetApiState as a side effect
    // But we can't do this here because circular deps, so we have to do it manually
    // https://redux-toolkit.js.org/rtk-query/api/created-api/api-slice-utils#resetapistate
    nftApi: {
      queries: {},
      mutations: {},
      provided: {},
      subscriptions: {},
      config: {
        online: true,
        focused: false,
        middlewareRegistered: true,
        refetchOnFocus: false,
        refetchOnReconnect: true,
        refetchOnMountOrArgChange: false,
        keepUnusedDataFor: 60,
        reducerPath: 'nftApi',
      },
    },
  }
}
