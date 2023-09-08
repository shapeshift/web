import { useToast } from '@chakra-ui/react'
import type { Event } from '@shapeshiftoss/hdwallet-core'
import { Events } from '@shapeshiftoss/hdwallet-core'
import type { Dispatch } from 'react'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import type { DeviceState, InitialState } from 'context/WalletProvider/WalletProvider'
import { usePoll } from 'hooks/usePoll/usePoll'

import { ButtonRequestType, FailureType, Message, MessageType } from '../KeepKeyTypes'

export const useKeepKeyEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
  loadWallet: () => void,
  setDeviceState: (deviceState: Partial<DeviceState>) => void,
) => {
  const {
    keyring,
    modal,
    deviceState: { disposition, isUpdatingPin },
  } = state

  const toast = useToast()
  const translate = useTranslate()
  const { poll } = usePoll()

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      const [deviceId, event] = e
      const { message_enum, message_type, message, from_wallet } = event

      if (message_type === Message.PINREQUEST || message?.message === Message.PINCHANGED) {
        setDeviceState({
          isDeviceLoading: false,
        })
      }

      switch (message_enum) {
        case MessageType.SUCCESS:
          switch (message.message) {
            case 'Device reset':
              setDeviceState({
                disposition: 'initialized',
              })
              if (modal) dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
              break
            case 'Device recovered':
              setDeviceState({
                disposition: 'initialized',
              })
              if (modal) dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
              toast({
                title: translate('common.success'),
                description: translate('modals.keepKey.recoverySentenceEntry.toastMessage'),
                status: 'success',
                isClosable: true,
              })
              break
            default:
              break
          }
          setDeviceState({
            awaitingDeviceInteraction: false,
            lastDeviceInteractionStatus: 'success',
          })
          loadWallet()
          break
        case MessageType.BUTTONREQUEST:
          setDeviceState({ awaitingDeviceInteraction: true })
          // This is a bit magic but KeepKey's recovery seed backup request in the reset flow sends
          // an "other" code, so it's the best we can do unless we update the firmware
          const isRecoverySeedBackupRequest =
            from_wallet &&
            message.code === ButtonRequestType.OTHER &&
            disposition === 'initializing'
          if (isRecoverySeedBackupRequest) {
            dispatch({ type: WalletActions.OPEN_KEEPKEY_RECOVERY, payload: { deviceId } })
          }
          break
        case MessageType.PASSPHRASEREQUEST:
          dispatch({ type: WalletActions.OPEN_KEEPKEY_PASSPHRASE, payload: { deviceId } })
          break
        // ACK just means we sent it, doesn't mean it was successful
        case MessageType.PASSPHRASEACK:
          if (modal) dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

          // KeepKey doesn't send a successful response on passphrase sent request
          // So, we need to poll to keep the DeviceState synced
          poll({
            fn: async () => {
              const id = keyring.getAlias(deviceId)
              const wallet = keyring.get(id)
              // It will await forever until the device is not waiting for interaction anymore
              // because getFeatures is not working in case the device is waiting an interaction
              const walletFeatures = await wallet?.getFeatures()

              return walletFeatures
            },
            validate: () => {
              // If it goes through the validate method, it means that the keepkey could be queried
              // so we can safely guess that it's not waiting for interaction anymore
              setDeviceState({ awaitingDeviceInteraction: false })
              return true
            },
            interval: 2000,
            maxAttempts: 30,
          })

          break
        case MessageType.PINMATRIXREQUEST:
          setDeviceState({ awaitingDeviceInteraction: false })
          if (!isUpdatingPin) {
            dispatch({
              type: WalletActions.OPEN_KEEPKEY_PIN,
              payload: {
                deviceId,
                pinRequestType: message?.type,
              },
            })
          } else {
            dispatch({
              type: WalletActions.SET_PIN_REQUEST_TYPE,
              payload: message?.type,
            })
          }
          break
        case MessageType.CHARACTERREQUEST:
          setDeviceState({ awaitingDeviceInteraction: false })
          dispatch({
            type: WalletActions.OPEN_KEEPKEY_CHARACTER_REQUEST,
            payload: {
              characterPos: message?.characterPos,
              wordPos: message?.wordPos,
            },
          })
          break
        // ACK just means we sent it, doesn't mean it was successful
        case MessageType.PINMATRIXACK:
          if (modal) dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          break
        // @TODO: What do we want to do with these events?
        case MessageType.FAILURE:
          switch (message?.code) {
            case FailureType.PINCANCELLED:
              break
            case FailureType.ACTIONCANCELLED:
              setDeviceState({ awaitingDeviceInteraction: false })
              break
            case FailureType.NOTINITIALIZED:
              ;(async () => {
                const id = keyring.getAlias(deviceId)
                const wallet = keyring.get(id)
                const walletFeatures = await wallet?.getFeatures()

                // In case this event happens and passphraseProtection is on, it means that the keepkey
                // has been initialized already but the passphrase has been cancelled by the user
                if (walletFeatures?.passphraseProtection) {
                  setDeviceState({ awaitingDeviceInteraction: false })
                  dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
                } else {
                  dispatch({
                    type: WalletActions.OPEN_KEEPKEY_INITIALIZE,
                    payload: {
                      deviceId,
                    },
                  })
                }
              })()
              break
            case FailureType.SYNTAXERROR:
              dispatch({
                type: WalletActions.OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE,
                payload: {
                  deviceId,
                },
              })
              break
            default:
              setDeviceState({ lastDeviceInteractionStatus: 'error' })
              break
          }
          break
        default:
          // Ignore unhandled events
          break
      }
    }

    const handleConnect = async (e: [deviceId: string, message: Event]) => {
      const [deviceId] = e

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
          await wallet.getFeatures()
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
              connectedType: KeyManager.KeepKey,
              icon: state.walletInfo.icon, // We're reconnecting the same wallet so we can reuse the walletInfo
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        }
      } catch (e) {
        console.error(e)
      }
    }

    const handleDisconnect = (deviceId: string) => {
      try {
        const id = keyring.getAlias(deviceId)
        if (id === state.walletInfo?.deviceId) {
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
        }
        if (modal) {
          // Little trick to send the user back to the wallet select route
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        }
      } catch (e) {
        console.error(e)
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
  }, [
    dispatch,
    keyring,
    loadWallet,
    isUpdatingPin,
    modal,
    state.walletInfo,
    setDeviceState,
    disposition,
    toast,
    translate,
    poll,
    state.connectedType,
    state.modalType,
  ])
}
