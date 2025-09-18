import { useCallback, useEffect, useState } from 'react'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

const LEDGER_VENDOR_ID = 0x2c97

type LedgerDeviceState = 'connected' | 'disconnected' | 'unknown'
type ConnectionState = 'idle' | 'attempting' | 'success' | 'failed'

export const useLedgerConnectionState = () => {
  const [deviceState, setDeviceState] = useState<LedgerDeviceState>('unknown')
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const { dispatch, state, getAdapter } = useWallet()
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

  // Auto-attempt connection when modal opens (if flag enabled)
  const handleAutoConnect = useCallback(async () => {
    if (!isLedgerReadOnlyEnabled || connectionState !== 'idle') return

    setConnectionState('attempting')

    const adapter = await getAdapter(KeyManager.Ledger)
    if (adapter) {
      try {
        const wallet = await adapter.pairDevice().catch(() => null)

        if (wallet) {
          setConnectionState('success')
        } else {
          // Only set to failed if USB device is actually disconnected
          // This prevents false failures when device is connected but pairing fails
          setConnectionState(deviceState === 'disconnected' ? 'failed' : 'idle')
        }
      } catch (error) {
        setConnectionState(deviceState === 'disconnected' ? 'failed' : 'idle')
      }
    } else {
      setConnectionState('failed')
    }
  }, [isLedgerReadOnlyEnabled, connectionState, getAdapter, deviceState])

  // Handle USB device state changes and auto-connection
  useEffect(() => {
    if (!isLedgerReadOnlyEnabled) return

    // If device disconnects while we're in success state, transition to failed
    if (deviceState === 'disconnected' && connectionState === 'success') {
      setConnectionState('failed')
    }

    // If device reconnects while we're in failed state, reset to idle to trigger auto-connect
    if (deviceState === 'connected' && connectionState === 'failed') {
      setConnectionState('idle')
      // Trigger auto-connect after a short delay to allow state to settle
      setTimeout(() => {
        handleAutoConnect()
      }, 500)
    }
  }, [deviceState, connectionState, isLedgerReadOnlyEnabled, handleAutoConnect])

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
  }, [deviceState, state.walletInfo, dispatch, isLedgerReadOnlyEnabled])

  return {
    deviceState,
    connectionState,
    isConnected: deviceState === 'connected',
    isDisconnected: deviceState === 'disconnected',
    isUnknown: deviceState === 'unknown',
    isConnectionAttempting: connectionState === 'attempting',
    isConnectionSuccess: connectionState === 'success',
    isConnectionFailed: connectionState === 'failed',
    handleAutoConnect,
  }
}
