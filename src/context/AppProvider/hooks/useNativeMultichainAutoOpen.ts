import { useEffect, useRef } from 'react'

import { useModal } from '@/hooks/useModal/useModal'
import { useNativeMultichainPreference } from '@/hooks/useNativeMultichainPreference'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const useNativeMultichainAutoOpen = () => {
  const {
    state: { deviceId, isConnected, modal },
  } = useWallet()
  const { shouldShowDeprecationModal } = useNativeMultichainPreference(deviceId)
  const nativeMultichainModal = useModal('nativeMultichain')
  const hasOpened = useRef(false)

  useEffect(() => {
    const debugInfo = { isConnected, shouldShowDeprecationModal, hasOpened: hasOpened.current, modal: !!modal, deviceId }
    console.log('[MM Native AutoOpen]', debugInfo)
    ;(window as any).__MM_AUTO_OPEN_DEBUG = (window as any).__MM_AUTO_OPEN_DEBUG || []
    ;(window as any).__MM_AUTO_OPEN_DEBUG.push(debugInfo)
    if (!isConnected) {
      hasOpened.current = false
      return
    }
    if (!shouldShowDeprecationModal) return
    if (hasOpened.current) return
    // Don't auto-open if the wallet connect modal is open (the connect flow handles it via route)
    if (modal) return

    hasOpened.current = true
    nativeMultichainModal.open({})
  }, [isConnected, shouldShowDeprecationModal, nativeMultichainModal, modal, deviceId])
}
