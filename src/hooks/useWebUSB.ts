import { useEffect, useState } from 'react'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

const LEDGER_VENDOR_ID = 0x2c97

type USBDeviceState = 'connected' | 'disconnected' | 'unknown'

export const useWebUSB = () => {
  const [deviceState, setDeviceState] = useState<USBDeviceState>('unknown')
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

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

  return {
    deviceState,
    isConnected: deviceState === 'connected',
    isDisconnected: deviceState === 'disconnected',
    isUnknown: deviceState === 'unknown',
  }
}
