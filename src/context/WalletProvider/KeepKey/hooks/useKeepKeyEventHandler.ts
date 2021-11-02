import { Event, Events } from '@shapeshiftoss/hdwallet-core'
import { Dispatch, useEffect } from 'react'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { ActionTypes, InitialState, WalletActions } from 'context/WalletProvider/WalletProvider'

import { FailureType, MessageType } from '../KeepKeyTypes'

type KeyringState = Pick<InitialState, 'keyring' | 'walletInfo'>

export const useKeepKeyEventHandler = (state: KeyringState, dispatch: Dispatch<ActionTypes>) => {
  const { keepkeyPin, keepkeyPassphrase } = useModal()
  const { keyring } = state

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      console.info('KeepKey Event', e)
      switch (e[1].message_enum) {
        case MessageType.PASSPHRASEREQUEST:
          if (!keepkeyPassphrase.isOpen) {
            keepkeyPassphrase.open({ deviceId: e[0] })
          }
          break
        // ACK just means we sent it, doesn't mean it was successful
        case MessageType.PASSPHRASEACK:
          if (keepkeyPassphrase.isOpen) keepkeyPassphrase.close()
          break
        case MessageType.PINMATRIXREQUEST:
          if (!keepkeyPin.isOpen) {
            keepkeyPin.open({ deviceId: e[0], pinRequestType: e[1].message?.type })
          }
          break
        // ACK just means we sent it, doesn't mean it was successful
        case MessageType.PINMATRIXACK:
          if (keepkeyPin.isOpen) keepkeyPin.close()
          break
        // @TODO: What do we want to do with these events?
        case MessageType.FAILURE:
          switch (e[1].message?.code) {
            case FailureType.PINCANCELLED:
              console.warn('KeepKey Event [FAILURE]: PIN Cancelled')
              break
            default:
              console.warn('KeepKey Event [FAILURE]: ', e[1].message?.message)
              break
          }
          break
        default:
          // If there wasn't an enum value, then we'll check the message type
          console.info('KeepKey Unknown Event', e)
      }
    }

    const handleConnect = (deviceId: string) => {
      console.info('KeepKey Connected: ', deviceId)
      if (state.walletInfo?.deviceId === deviceId) {
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      }
    }

    const handleDisconnect = (deviceId: string) => {
      console.info('KeepKey Disconnected: ', deviceId)
      if (state.walletInfo?.deviceId === deviceId) {
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
      }
    }

    // Handle all KeepKey events
    keyring.on(['KeepKey', '*', '*'], handleEvent)
    keyring.on(['KeepKey', '*', Events.CONNECT], handleConnect)
    keyring.on(['KeepKey', '*', Events.DISCONNECT], handleDisconnect)

    return () => {
      keyring.off(['KeepKey', '*', '*'], handleEvent)
      keyring.off(['KeepKey', '*', Events.CONNECT], handleConnect)
      keyring.off(['KeepKey', '*', Events.DISCONNECT], handleDisconnect)
    }
  }, [dispatch, keepkeyPassphrase, keepkeyPin, keyring, state.walletInfo?.deviceId])
}
