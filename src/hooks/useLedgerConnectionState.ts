import { useCallback, useEffect, useMemo, useState } from 'react'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { LEDGER_VENDOR_ID } from '@/context/WalletProvider/Ledger/constants'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

type LedgerDeviceState = 'connected' | 'disconnected' | 'unknown'
type ConnectionState = 'idle' | 'attempting' | 'success' | 'failed'

const AUTO_CONNECT_DELAY = 500

const isLedgerDevice = (device: USBDevice) => device.vendorId === LEDGER_VENDOR_ID

export const useLedgerConnectionState = () => {
  const [deviceState, setDeviceState] = useState<LedgerDeviceState>('unknown')
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const { dispatch, state, getAdapter } = useWallet()
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  useEffect(() => {
    if (!isLedgerReadOnlyEnabled || !navigator.usb) return

    const handleConnect = (event: USBConnectionEvent) => {
      if (isLedgerDevice(event.device)) {
        setDeviceState('connected')
      }
    }

    const handleDisconnect = (event: USBConnectionEvent) => {
      if (isLedgerDevice(event.device)) {
        setDeviceState('disconnected')
      }
    }

    navigator.usb.addEventListener('connect', handleConnect)
    navigator.usb.addEventListener('disconnect', handleDisconnect)

    const checkInitialState = async () => {
      try {
        const devices = await navigator.usb.getDevices()
        const hasLedger = devices.some(isLedgerDevice)
        setDeviceState(hasLedger ? 'connected' : 'disconnected')
      } catch {
        setDeviceState('unknown')
      }
    }

    checkInitialState()

    return () => {
      navigator.usb.removeEventListener('connect', handleConnect)
      navigator.usb.removeEventListener('disconnect', handleDisconnect)
    }
  }, [isLedgerReadOnlyEnabled])

  const handleAutoConnect = useCallback(async () => {
    if (!isLedgerReadOnlyEnabled || connectionState !== 'idle') return

    setConnectionState('attempting')

    const adapter = await getAdapter(KeyManager.Ledger)
    if (!adapter) {
      setConnectionState('failed')
      return
    }

    try {
      const wallet = await adapter.pairDevice().catch(() => null)

      if (wallet) {
        setConnectionState('success')
        return
      }

      setConnectionState(deviceState === 'disconnected' ? 'failed' : 'idle')
    } catch {
      setConnectionState(deviceState === 'disconnected' ? 'failed' : 'idle')
    }
  }, [isLedgerReadOnlyEnabled, connectionState, getAdapter, deviceState])

  useEffect(() => {
    if (!isLedgerReadOnlyEnabled) return

    if (deviceState === 'disconnected' && connectionState === 'success') {
      setConnectionState('failed')
      return
    }

    if (deviceState === 'connected' && connectionState === 'failed') {
      setConnectionState('idle')
      setTimeout(() => {
        handleAutoConnect()
      }, AUTO_CONNECT_DELAY)
    }
  }, [deviceState, connectionState, isLedgerReadOnlyEnabled, handleAutoConnect])

  useEffect(() => {
    if (!isLedgerReadOnlyEnabled) return

    const isCurrentWalletLedger = state.connectedType === KeyManager.Ledger
    const isWalletConnected = state.isConnected
    const hasWallet = !!state.wallet
    const isUSBDisconnected = deviceState === 'disconnected'

    const shouldDisconnectWallet =
      isCurrentWalletLedger &&
      isWalletConnected &&
      hasWallet &&
      isUSBDisconnected &&
      state.walletInfo

    if (!shouldDisconnectWallet) return

    dispatch({
      type: WalletActions.SET_IS_CONNECTED,
      payload: false,
    })

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
  }, [state, deviceState, dispatch, isLedgerReadOnlyEnabled])

  const deviceHelpers = useMemo(() => ({
    isConnected: deviceState === 'connected',
    isDisconnected: deviceState === 'disconnected',
    isUnknown: deviceState === 'unknown',
  }), [deviceState])

  const connectionHelpers = useMemo(() => ({
    isConnectionAttempting: connectionState === 'attempting',
    isConnectionSuccess: connectionState === 'success',
    isConnectionFailed: connectionState === 'failed',
  }), [connectionState])

  const value = useMemo(
    () => ({
      deviceState,
      connectionState,
      ...deviceHelpers,
      ...connectionHelpers,
      handleAutoConnect,
    }),
    [deviceState, connectionState, deviceHelpers, connectionHelpers, handleAutoConnect],
  )

  return value
}
