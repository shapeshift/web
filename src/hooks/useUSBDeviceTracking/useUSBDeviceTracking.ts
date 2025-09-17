import { useEffect, useState } from 'react'

const LEDGER_VENDOR_ID = 0x2c97

type USBDeviceState = 'connected' | 'disconnected' | 'unknown'

export const useUSBDeviceTracking = (enabled: boolean = true) => {
  const [deviceState, setDeviceState] = useState<USBDeviceState>('unknown')

  useEffect(() => {
    if (!enabled || !navigator.usb) return

    const handleConnect = (event: USBConnectionEvent) => {
      if (event.device.vendorId === LEDGER_VENDOR_ID) {
        console.log('USB: Ledger device connected', {
          vendorId: event.device.vendorId,
          productId: event.device.productId,
          productName: event.device.productName,
          manufacturerName: event.device.manufacturerName
        })
        setDeviceState('connected')
      }
    }

    const handleDisconnect = (event: USBConnectionEvent) => {
      if (event.device.vendorId === LEDGER_VENDOR_ID) {
        console.log('USB: Ledger device disconnected', {
          vendorId: event.device.vendorId,
          productId: event.device.productId,
          productName: event.device.productName,
          manufacturerName: event.device.manufacturerName
        })
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
        
        console.log('USB: Initial device check', {
          totalDevices: devices.length,
          ledgerDevicesCount: ledgerDevices.length,
          hasLedger,
          ledgerDevices: ledgerDevices.map(d => ({
            vendorId: d.vendorId,
            productId: d.productId,
            productName: d.productName,
            manufacturerName: d.manufacturerName
          }))
        })
        
        setDeviceState(hasLedger ? 'connected' : 'disconnected')
      } catch (error) {
        // getDevices() may fail if no permissions granted
        console.log('USB: Initial device check failed', error)
        setDeviceState('unknown')
      }
    }

    checkInitialState()

    // Cleanup
    return () => {
      navigator.usb.removeEventListener('connect', handleConnect)
      navigator.usb.removeEventListener('disconnect', handleDisconnect)
    }
  }, [enabled])

  return {
    deviceState,
    isConnected: deviceState === 'connected',
    isDisconnected: deviceState === 'disconnected',
    isUnknown: deviceState === 'unknown',
  }
}