import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { Portfolio } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export const clearWalletConnectWalletsMetadata = (state: Portfolio): Portfolio & PersistPartial => {
  const updatedWalletIds = state.wallet.ids.filter(id => !id.startsWith('wc:'))
  const updatedWalletById = Object.fromEntries(
    Object.entries(state.wallet.byId).filter(([walletId]) => !walletId.startsWith('wc:')),
  )

  return {
    ...state,
    wallet: {
      ...state.wallet,
      ids: updatedWalletIds,
      byId: updatedWalletById,
    },
  } as Portfolio & PersistPartial
}
