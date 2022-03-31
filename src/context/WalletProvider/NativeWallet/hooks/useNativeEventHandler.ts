import { Event } from '@shapeshiftoss/hdwallet-core'
import { NativeEvents } from '@shapeshiftoss/hdwallet-native'
import { Dispatch, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { ActionTypes, WalletActions } from 'context/WalletProvider/actions'
import { InitialState } from 'context/WalletProvider/WalletProvider'
import { useModal } from 'hooks/useModal/useModal'

type KeyringState = Pick<InitialState, 'keyring' | 'walletInfo'>

export const useNativeEventHandler = (state: KeyringState, dispatch: Dispatch<ActionTypes>) => {
  const { nativePassword } = useModal()
  // const history = useHistory()
  const { keyring } = state

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      console.info('Native Wallet Event', e)
      const deviceId = e[0]
      switch (e[1].message_type) {
        case NativeEvents.MNEMONIC_REQUIRED:
          if (!deviceId) break
          // if (!nativePassword.isOpen) {
          //   nativePassword.open({ deviceId: e[0] })
          // }
          // dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '/native/enter-password' })
          // dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
          dispatch({ type: WalletActions.NATIVE_PASSWORD_OPEN, payload: { modal: true, deviceId } })

          // history.push('/native/enter-password', { deviceId })
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

    // if (!nativePassword) return
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
