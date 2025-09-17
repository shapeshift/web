import { useEffect } from 'react'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWebUSB } from '@/hooks/useWebUSB'

export const useLedgerDisconnectionHandler = () => {
  const { dispatch, state } = useWallet()
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  // Track USB device connections
  const { isDisconnected: isUSBDisconnected } = useWebUSB(isLedgerReadOnlyEnabled)

  // Handle Ledger disconnection
  useEffect(() => {
    if (!isLedgerReadOnlyEnabled) return

    // Check if current wallet is a Ledger and USB device was disconnected
    const isCurrentWalletLedger = state.connectedType === KeyManager.Ledger
    const isWalletConnected = state.isConnected
    const hasWallet = !!state.wallet

    // Only disconnect wallet if:
    // 1. Current wallet is Ledger
    // 2. Wallet is currently connected
    // 3. We have a wallet instance
    // 4. USB device was disconnected
    if (isCurrentWalletLedger && isWalletConnected && hasWallet && isUSBDisconnected) {
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
          connectedType: state.connectedType,
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
  ])
}
