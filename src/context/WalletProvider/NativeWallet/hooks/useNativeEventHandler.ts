import { Event } from '@shapeshiftoss/hdwallet-core'
import { NativeEvents } from '@shapeshiftoss/hdwallet-native'
import { Dispatch, useEffect } from 'react'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { ActionTypes, InitialState } from 'context/WalletProvider/WalletProvider'

type KeyringState = Pick<InitialState, 'keyring' | 'walletInfo'>

export const useNativeEventHandler = (state: KeyringState, dispatch: Dispatch<ActionTypes>) => {
  const { nativePassword } = useModal()
  const { keyring } = state

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      console.info('Native Wallet Event', e)
      switch (e[1].message_type) {
        case NativeEvents.MNEMONIC_REQUIRED:
          if (!nativePassword.isOpen) {
            nativePassword.open({ deviceId: e[0] })
          }
          break
        case NativeEvents.READY:
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
      keyring.on(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], handleEvent)
      keyring.on(['Native', '*', NativeEvents.READY], handleEvent)
    }
    return () => {
      keyring.off(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], handleEvent)
      keyring.off(['Native', '*', NativeEvents.READY], handleEvent)
    }
  }, [dispatch, nativePassword, keyring])
}
