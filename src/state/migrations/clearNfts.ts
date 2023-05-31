import { initialState, nftApi } from 'state/apis/nft/nftApi'
import type { ReduxState } from 'state/reducer'
import { store } from 'state/store'

export const clearNfts = (state: ReduxState): ReduxState => {
  // Dispatches the nftapi as a side effect, since this isn't a regular slice and there's no initialState
  // https://redux-toolkit.js.org/rtk-query/api/created-api/api-slice-utils#resetapistate
  store.dispatch(nftApi.util.resetApiState())
  return {
    ...state,
    nft: initialState,
  }
}
