import { Event } from '@shapeshiftoss/hdwallet-core'
import type { NativeEvents } from '@shapeshiftoss/hdwallet-native'
import { Dispatch, useEffect } from 'react'
import * as ta from 'type-assertions'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { ActionTypes, InitialState } from 'context/WalletProvider/WalletProvider'

type KeyringState = Pick<InitialState, 'keyring' | 'walletInfo'>

// This is duplicative, but it avoids having to eagerly-load the entire hdwallet-native
// library and all its supporting dependencies just to be able to use some enum values.
// The associated type assertions here will ensure compile-time errors if this version
// of the enum ever goes out-of-sync with the version from hdwallet-native.
const nativeEvents: typeof NativeEvents = {
  MNEMONIC_REQUIRED: (() => {
    const out = 'MNEMONIC_REQUIRED'
    ta.assert<ta.Extends<NativeEvents.MNEMONIC_REQUIRED, typeof out>>()
    return out as NativeEvents.MNEMONIC_REQUIRED
  })(),
  READY: (() => {
    const out = 'READY'
    ta.assert<ta.Extends<NativeEvents.READY, typeof out>>()
    return out as NativeEvents.READY
  })()
}

export const useNativeEventHandler = (state: KeyringState, dispatch: Dispatch<ActionTypes>) => {
  const { nativePassword } = useModal()
  const { keyring } = state

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      console.info('Native Wallet Event', e)
      switch (e[1].message_type) {
        case nativeEvents.MNEMONIC_REQUIRED:
          if (!nativePassword.isOpen) {
            nativePassword.open({ deviceId: e[0] })
          }
          break
        case nativeEvents.READY:
          if (!nativePassword.isOpen) {
            nativePassword.close()
          }
          break
        default:
          // If there wasn't an enum value, then we'll check the message type
          console.info('Native Wallet Unknown Event', e)
      }
    }

    if (keyring) {
      keyring.on(['Native', '*', nativeEvents.MNEMONIC_REQUIRED], handleEvent)
      keyring.on(['Native', '*', nativeEvents.READY], handleEvent)
    }
    return () => {
      keyring.off(['Native', '*', nativeEvents.MNEMONIC_REQUIRED], handleEvent)
      keyring.off(['Native', '*', nativeEvents.READY], handleEvent)
    }
  }, [dispatch, nativePassword, keyring])
}
