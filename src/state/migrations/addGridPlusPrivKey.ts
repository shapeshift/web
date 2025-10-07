import type { PersistPartial } from 'redux-persist/es/persistReducer'

import type { LocalWalletState } from '@/state/slices/localWalletSlice/localWalletSlice'

// Migration to add gridplusPrivKey field to localWallet slice
export const addGridPlusPrivKey = (state: any): LocalWalletState & PersistPartial => {
  return {
    ...state,
    gridplusPrivKey: null, // Add new field with default value
  } as LocalWalletState & PersistPartial
}
