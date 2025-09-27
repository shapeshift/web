import { useCallback, useEffect, useMemo, useState } from 'react'

import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectPortfolioHasWalletId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type LedgerDeviceState = 'connected' | 'disconnected' | 'unknown'
type ConnectionState = 'idle' | 'attempting' | 'success' | 'failed'

const AUTO_CONNECT_DELAY = 500
// https://github.com/LedgerHQ/ledger-live/blob/c2d2cbcd81fe46ac1967802b3770a05d805a4d0e/libs/ledgerjs/packages/devices/src/index.ts#L147-L161
const LEDGER_VENDOR_ID = 0x2c97
const LEDGER_DEVICE_ID = '0001'

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

  const handleConnect = useCallback((event: USBConnectionEvent) => {
    if (isLedgerDevice(event.device)) {
      console.log('[Ledger Debug] USB connect event:', {
        device: event.device.productName,
        vendorId: event.device.vendorId,
        productId: event.device.productId,
        timestamp: Date.now(),
      })
      setDeviceState('connected')
    }
  }, [])

  const handleDisconnect = useCallback((event: USBConnectionEvent) => {
    if (isLedgerDevice(event.device)) {
      console.log('[Ledger Debug] USB disconnect event:', {
        device: event.device.productName,
        vendorId: event.device.vendorId,
        productId: event.device.productId,
        timestamp: Date.now(),
      })
      setDeviceState('disconnected')
    }
  }, [])

  useEffect(() => {
    // Only enable USB monitoring for users who have previously connected a Ledger
    // This ensures no shenanigans re: new Ledger USB detection logic for the very initial state of
    // no USB perms granted, first time connecting a Ledger to app
    if (!isLedgerReadOnlyEnabled || !navigator.usb || !isPreviousLedgerDeviceDetected) return

    navigator.usb.addEventListener('connect', handleConnect)
    navigator.usb.addEventListener('disconnect', handleDisconnect)

    const checkInitialState = async () => {
      try {
        const devices = await navigator.usb.getDevices()
        console.log('[Ledger Debug] Initial USB device check:', {
          totalDevices: devices.length,
          ledgerDevices: devices.filter(isLedgerDevice).map(d => ({
            productName: d.productName,
            vendorId: d.vendorId,
            productId: d.productId,
          })),
          timestamp: Date.now(),
        })
        const hasLedger = devices.some(isLedgerDevice)
        const newState = hasLedger ? 'connected' : 'disconnected'
        console.log('[Ledger Debug] Initial device state set:', { state: newState })
        setDeviceState(newState)
      } catch (error) {
        console.log('[Ledger Debug] Initial USB check failed:', { error: (error as any)?.message })
        setDeviceState('unknown')
      }
    }

    checkInitialState()

    return () => {
      navigator.usb.removeEventListener('connect', handleConnect)
      navigator.usb.removeEventListener('disconnect', handleDisconnect)
    }
  }, [isLedgerReadOnlyEnabled, isPreviousLedgerDeviceDetected, handleConnect, handleDisconnect])

  const handleAutoConnect = useCallback(async () => {
    if (!isLedgerReadOnlyEnabled || connectionState !== 'idle') {
      return
    }

    setConnectionState('attempting')

    const adapter = await getAdapter(KeyManager.Ledger)
    if (!adapter) {
      setConnectionState('failed')
      return
    }

    const wallet = await adapter.pairDevice().catch(() => null)

    if (wallet) {
      setConnectionState('success')
      return
    }

    // If we reach here, pairing failed - set state based on device connectivity
    const failedConnectionState = deviceState === 'disconnected' ? 'failed' : 'idle'
    setConnectionState(failedConnectionState)
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

    console.log('[Ledger Debug] Wallet disconnect evaluation:', {
      isCurrentWalletLedger,
      isWalletConnected,
      hasWallet,
      isUSBDisconnected,
      hasWalletInfo: !!state.walletInfo,
      shouldDisconnectWallet,
      deviceState,
      timestamp: Date.now(),
    })

    if (!shouldDisconnectWallet) return

    console.log('[Ledger Debug] Scheduling wallet disconnect in 1000ms...')

    // Add 1000ms debounce to handle quick hardware reconnections
    const disconnectTimeoutId = setTimeout(() => {
      // Check if still disconnected after debounce period
      if (deviceState === 'disconnected') {
        console.log('[Ledger Debug] Disconnecting wallet after debounce period')

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
      } else {
        console.log('[Ledger Debug] Device reconnected during debounce, canceling disconnect')
      }
    }, 1000)

    return () => {
      console.log('[Ledger Debug] Clearing disconnect timeout')
      clearTimeout(disconnectTimeoutId)
    }
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
