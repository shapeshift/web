import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { NftState } from 'state/apis/nft/nftApi'
import { initialState } from 'state/apis/nft/nftApi'

export const clearNfts = (_state: NftState): NftState & PersistPartial => {
  return initialState as NftState & PersistPartial
}
