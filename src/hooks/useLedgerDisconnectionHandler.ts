import { useEffect } from 'react'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWebUSB } from '@/hooks/useWebUSB'

export const useLedgerDisconnectionHandler = () => {
  const { dispatch, state } = useWallet()
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  const { isDisconnected: isUSBDisconnected } = useWebUSB()

  useEffect(() => {
    if (!isLedgerReadOnlyEnabled) return

    // Check if current wallet is a Ledger and USB device was disconnected
    const isCurrentWalletLedger = state.connectedType === KeyManager.Ledger
    const isWalletConnected = state.isConnected
    const hasWallet = !!state.wallet

    if (
      isCurrentWalletLedger &&
      isWalletConnected &&
      hasWallet &&
      isUSBDisconnected &&
      state.walletInfo
    ) {
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: false,
      })
      // Also set wallet to null for consistency with app refresh case
      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet: null,
          name: state.walletInfo?.name,
          icon: state.walletInfo?.icon,
          deviceId: state.walletInfo?.deviceId,
          connectedType: KeyManager.Ledger,
        },
      })
    }
  }, [
    isUSBDisconnected,
    state.connectedType,
    state.isConnected,
    state.wallet,
    dispatch,
    isLedgerReadOnlyEnabled,
    state.walletInfo?.name,
    state.walletInfo?.icon,
    state.walletInfo?.deviceId,
    state.walletInfo,
  ])
}
