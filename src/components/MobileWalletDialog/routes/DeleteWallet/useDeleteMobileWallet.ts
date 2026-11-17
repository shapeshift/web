import { useCallback } from 'react'

import { deleteWallet } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch } from '@/state/store'

/**
 * Delete a saved mobile wallet and clear its local state.
 *
 * Resolves `false` when the mobile app did not delete it, e.g. the user cancelled the
 * native confirmation. `onDeleted` runs in the same tick as the disconnect.
 */
export const useDeleteMobileWallet = () => {
  const { disconnect, state } = useWallet()
  const appDispatch = useAppDispatch()
  const connectedDeviceId = state.walletInfo?.deviceId

  return useCallback(
    async (vault: RevocableWallet, onDeleted?: () => void): Promise<boolean> => {
      if (!vault.id) return false
      if ((await deleteWallet(vault.id)) !== true) return false

      appDispatch(portfolio.actions.clearWalletPortfolioState(vault.id))

      if (connectedDeviceId === vault.id) {
        disconnect()
      }
      onDeleted?.()
      return true
    },
    [appDispatch, connectedDeviceId, disconnect],
  )
}
