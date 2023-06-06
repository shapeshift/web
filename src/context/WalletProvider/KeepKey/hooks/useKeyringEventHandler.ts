import type { Keyring } from '@shapeshiftoss/hdwallet-core'
import { useEffect } from 'react'

interface KeyringState {
  keyring: Keyring
}

export const useKeyringEventHandler = (state: KeyringState) => {
  const { keyring } = state

  useEffect(() => {
    const handleEvent = () => {}

    // Handle all KeepKey events
    keyring.onAny(handleEvent)

    return () => {
      keyring.offAny(handleEvent)
    }
  }, [keyring])
}
