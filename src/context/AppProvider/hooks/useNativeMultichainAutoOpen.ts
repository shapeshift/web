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
