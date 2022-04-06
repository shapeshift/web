import { Event } from '@shapeshiftoss/hdwallet-core'
import { NativeEvents } from '@shapeshiftoss/hdwallet-native'
import { Dispatch, useEffect } from 'react'
import { ActionTypes, WalletActions } from 'context/WalletProvider/actions'
import { InitialState } from 'context/WalletProvider/WalletProvider'

type KeyringState = Pick<InitialState, 'keyring' | 'walletInfo' | 'modal'>

export const useNativeEventHandler = (state: KeyringState, dispatch: Dispatch<ActionTypes>) => {
  const { keyring, modal } = state

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      console.info('Native Wallet Event', e)
      const deviceId = e[0]
      switch (e[1].message_type) {
        case NativeEvents.MNEMONIC_REQUIRED:
          if (!deviceId) break
          dispatch({ type: WalletActions.NATIVE_PASSWORD_OPEN, payload: { modal: true, deviceId } })

          break
        case NativeEvents.READY:
          if (modal) {
            dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
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
  }, [dispatch, keyring, modal])
}
