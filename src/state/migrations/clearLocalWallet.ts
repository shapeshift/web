import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { LocalWalletState } from 'state/slices/localWalletSlice/localWalletSlice'
import { initialState } from 'state/slices/localWalletSlice/localWalletSlice'
import type { Portfolio } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export const clearLocalWallet = (_state: Portfolio): LocalWalletState & PersistPartial => {
  return initialState as LocalWalletState & PersistPartial
}
