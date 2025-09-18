import { useEffect, useState } from 'react'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

const LEDGER_VENDOR_ID = 0x2c97

type LedgerDeviceState = 'connected' | 'disconnected' | 'unknown'

export const useLedgerConnectionState = () => {
  const [deviceState, setDeviceState] = useState<LedgerDeviceState>('unknown')
  const { dispatch, state } = useWallet()
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  // USB device monitoring effect
  useEffect(() => {
    if (!isLedgerReadOnlyEnabled || !navigator.usb) return

    const handleConnect = (event: USBConnectionEvent) => {
      if (event.device.vendorId === LEDGER_VENDOR_ID) {
        setDeviceState('connected')
      }
    }

    const handleDisconnect = (event: USBConnectionEvent) => {
      if (event.device.vendorId === LEDGER_VENDOR_ID) {
        setDeviceState('disconnected')
      }
    }

    // Add event listeners
    navigator.usb.addEventListener('connect', handleConnect)
    navigator.usb.addEventListener('disconnect', handleDisconnect)

    // Check initial state
    const checkInitialState = async () => {
      try {
        const devices = await navigator.usb.getDevices()
        const ledgerDevices = devices.filter(device => device.vendorId === LEDGER_VENDOR_ID)
        const hasLedger = ledgerDevices.length > 0

        setDeviceState(hasLedger ? 'connected' : 'disconnected')
      } catch (error) {
        // getDevices() may fail if no permissions granted
        setDeviceState('unknown')
      }
    }

    checkInitialState()

    // Cleanup
    return () => {
      navigator.usb.removeEventListener('connect', handleConnect)
      navigator.usb.removeEventListener('disconnect', handleDisconnect)
    }
  }, [isLedgerReadOnlyEnabled])

  // Wallet disconnection handling effect
  useEffect(() => {
    if (!isLedgerReadOnlyEnabled) return

    // Check if current wallet is a Ledger and USB device was disconnected
    const isCurrentWalletLedger = state.connectedType === KeyManager.Ledger
    const isWalletConnected = state.isConnected
    const hasWallet = !!state.wallet
    const isUSBDisconnected = deviceState === 'disconnected'

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
    deviceState,
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

  return {
    deviceState,
    isConnected: deviceState === 'connected',
    isDisconnected: deviceState === 'disconnected',
    isUnknown: deviceState === 'unknown',
  }
}
