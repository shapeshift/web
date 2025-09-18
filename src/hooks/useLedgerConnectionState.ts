import { useCallback, useEffect, useMemo, useState } from 'react'

import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { LEDGER_DEVICE_ID, LEDGER_VENDOR_ID } from '@/context/WalletProvider/Ledger/constants'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectPortfolioHasWalletId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type LedgerDeviceState = 'connected' | 'disconnected' | 'unknown'
type ConnectionState = 'idle' | 'attempting' | 'success' | 'failed'

const AUTO_CONNECT_DELAY = 500

const isLedgerDevice = (device: USBDevice) => device.vendorId === LEDGER_VENDOR_ID

const { name: LEDGER_NAME, icon: LEDGER_ICON } = SUPPORTED_WALLETS[KeyManager.Ledger]

export const useLedgerConnectionState = () => {
  const [deviceState, setDeviceState] = useState<LedgerDeviceState>('unknown')
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')

  const { dispatch, state, getAdapter } = useWallet()
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const isPreviousLedgerDeviceDetected = useAppSelector(state =>
    selectPortfolioHasWalletId(state, LEDGER_DEVICE_ID),
  )

  useEffect(() => {
    // Only enable USB monitoring for users who have previously connected a Ledger
    // This ensures no shenanigans re: new Ledger USB detection logic for the very initial state of
    // no USB perms granted, first time connecting a Ledger to app
    if (!isLedgerReadOnlyEnabled || !navigator.usb || !isPreviousLedgerDeviceDetected) return

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
      } catch (error) {
        setDeviceState('unknown')
      }
    }

    checkInitialState()

    return () => {
      navigator.usb.removeEventListener('connect', handleConnect)
      navigator.usb.removeEventListener('disconnect', handleDisconnect)
    }
  }, [isLedgerReadOnlyEnabled, isPreviousLedgerDeviceDetected])

  const handleAutoConnect = useCallback(async () => {
    console.log('[useLedgerConnectionState] handleAutoConnect called:', {
      isLedgerReadOnlyEnabled,
      connectionState,
      deviceState,
    })

    if (!isLedgerReadOnlyEnabled || connectionState !== 'idle') {
      console.log('[useLedgerConnectionState] handleAutoConnect early return:', {
        isLedgerReadOnlyEnabled,
        connectionState,
      })
      return
    }

    console.log('[useLedgerConnectionState] Starting auto-connect attempt')
    setConnectionState('attempting')

    const adapter = await getAdapter(KeyManager.Ledger)
    if (!adapter) {
      console.log('[useLedgerConnectionState] No adapter found, setting to failed')
      setConnectionState('failed')
      return
    }

    try {
      console.log('[useLedgerConnectionState] Attempting to pair device')
      const wallet = await adapter.pairDevice().catch(() => null)

      if (wallet) {
        console.log('[useLedgerConnectionState] Auto-connect successful')
        setConnectionState('success')
        return
      }

      const newState = deviceState === 'disconnected' ? 'failed' : 'idle'
      console.log('[useLedgerConnectionState] Auto-connect failed, setting to:', newState)
      setConnectionState(newState)
    } catch {
      const newState = deviceState === 'disconnected' ? 'failed' : 'idle'
      console.log('[useLedgerConnectionState] Auto-connect error, setting to:', newState)
      setConnectionState(newState)
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
        name: LEDGER_NAME,
        icon: LEDGER_ICON,
        deviceId: LEDGER_DEVICE_ID,
        connectedType: KeyManager.Ledger,
      },
    })
  }, [state, deviceState, dispatch, isLedgerReadOnlyEnabled])

  const deviceHelpers = useMemo(
    () => ({
      isConnected: deviceState === 'connected',
      isDisconnected: deviceState === 'disconnected',
      isUnknown: deviceState === 'unknown',
    }),
    [deviceState],
  )

  const connectionHelpers = useMemo(
    () => ({
      isConnectionAttempting: connectionState === 'attempting',
      isConnectionSuccess: connectionState === 'success',
      isConnectionFailed: connectionState === 'failed',
    }),
    [connectionState],
  )

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
