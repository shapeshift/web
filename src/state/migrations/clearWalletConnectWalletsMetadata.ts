import type { ReduxState } from 'state/reducer'

export const clearWalletConnectWalletsMetadata = (state: ReduxState): ReduxState => {
  const updatedWalletIds = state.portfolio.wallet.ids.filter(id => !id.startsWith('wc:'))
  const updatedWalletById = Object.fromEntries(
    Object.entries(state.portfolio.wallet.byId).filter(([walletId]) => !walletId.startsWith('wc:')),
  )

  return {
    ...state,
    portfolio: {
      ...state.portfolio,
      wallet: {
        ...state.portfolio.wallet,
        ids: updatedWalletIds,
        byId: updatedWalletById,
      },
    },
  }
}
