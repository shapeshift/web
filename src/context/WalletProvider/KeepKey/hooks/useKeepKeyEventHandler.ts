import { Event, Events } from '@shapeshiftoss/hdwallet-core'
import { ipcRenderer } from 'electron'
import { Dispatch, useEffect } from 'react'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { ActionTypes, InitialState, WalletActions } from 'context/WalletProvider/WalletProvider'

import { FailureType, MessageType } from '../KeepKeyTypes'

type KeyringState = Pick<InitialState, 'keyring' | 'walletInfo'>

export const useKeepKeyEventHandler = (state: KeyringState, dispatch: Dispatch<ActionTypes>) => {
  const { keepkeyPin, keepkeyPassphrase, initialize } = useModal()
  const { keyring } = state

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
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
        // Ignore unhandled events
      }
    }

    const handleConnect = async (deviceId: string) => {
      console.info('Device Connected: ', deviceId)
      /*
        Understanding KeepKey DeviceID aliases:

        1. There is a hardware SerialNumber and a separate DeviceID written to flash on the device.
        2. Out of the box, these two values ARE DIFFERENT.
        3. After a "wipe" command, the DeviceID in flash is updated to match SerialNumber
        4. Bootloader/firmware upgrades and device initialization do NOT change this value
        5. Every KeepKey will have an alias DeviceID until a "wipe" is called
       */
      try {
        const id = keyring.getAlias(deviceId)
        const wallet = keyring.get(id)
        if (wallet && id === state.walletInfo?.deviceId) {
          // This gets the firmware version needed for some KeepKey "supportsX" functions
          let features = await wallet.getFeatures()
          ipcRenderer.send('onKeepKeyInfo', features)
          if (!features.initialized) {
            initialize.open({})
          }
          // Show the label from the wallet instead of a generic name
          const name = (await wallet.getLabel()) || state.walletInfo.name
          // The keyring might have a new HDWallet instance for the device.
          // We'll replace the one we have in state with the new one
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              deviceId: id,
              meta: { label: name },
              icon: state.walletInfo.icon // We're reconnecting the same wallet so we can reuse the walletInfo
            }
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        }
      } catch (e) {
        console.error('Device Connected Error: ', e)
      }
    }

    const handleDisconnect = async (deviceId: string) => {
      console.info('Device Disconnected: ', deviceId)
      try {
        const id = keyring.getAlias(deviceId)
        if (id === state.walletInfo?.deviceId) {
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
        }
      } catch (e) {
        console.error('Device Disconnect Error:', e)
      }
    }

    // Handle all KeepKey events
    keyring.on(['KeepKey', '*', '*'], handleEvent)
    // HDWallet emits (DIS)CONNECT events as "KeepKey - {LABEL}" so we can't just listen for "KeepKey"
    keyring.on(['*', '*', Events.CONNECT], handleConnect)
    keyring.on(['*', '*', Events.DISCONNECT], handleDisconnect)

    return () => {
      keyring.off(['KeepKey', '*', '*'], handleEvent)
      keyring.off(['*', '*', Events.CONNECT], handleConnect)
      keyring.off(['*', '*', Events.DISCONNECT], handleDisconnect)
    }
  }, [dispatch, keepkeyPassphrase, keepkeyPin, keyring, state.walletInfo])
}
