import { useToast } from '@chakra-ui/toast'
import type { Event } from '@shapeshiftoss/hdwallet-core'
import { Events } from '@shapeshiftoss/hdwallet-core'
import type { Dispatch } from 'react'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import type { DeviceState, InitialState } from 'context/WalletProvider/WalletProvider'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'

import { ButtonRequestType, FailureType, Message, MessageType } from '../KeepKeyTypes'

const moduleLogger = logger.child({ namespace: ['useKeepKeyEventHandler'] })

export const useKeepKeyEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
  disconnect: () => void,
  setDeviceState: (deviceState: Partial<DeviceState>) => void,
  setNeedsReset: (reset: boolean) => void,
) => {
  const {
    keyring,
    modal,
    deviceState: { disposition, isUpdatingPin },
  } = state

  const toast = useToast()
  const translate = useTranslate()

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      const [deviceId, event] = e
      const { message_enum, message_type, message, from_wallet } = event

      const fnLogger = moduleLogger.child({
        namespace: ['handleEvent'],
        defaultFields: { deviceId, event },
      })
      fnLogger.trace('Handling Event')

      if (message_type === Message.PINREQUEST || message?.message === Message.PINCHANGED) {
        setDeviceState({
          isDeviceLoading: false,
        })
      }
      switch (message_enum) {
        case MessageType.SUCCESS:
          fnLogger.trace(message.message)
          switch (message.message) {
            case 'Device reset':
              setDeviceState({
                disposition: 'initialized',
              })
              setNeedsReset(true)
              handleDisconnect(deviceId)
              break
            case 'Device recovered':
              setDeviceState({
                disposition: 'initialized',
              })
              if (modal)
                dispatch({
                  type: WalletActions.SET_WALLET_MODAL,
                  payload: false,
                })
              setNeedsReset(true)
              handleDisconnect(deviceId)
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
          disconnect()
          break
        case MessageType.BUTTONREQUEST:
          setDeviceState({ awaitingDeviceInteraction: true })
          // This is a bit magic but KeepKey's recovery seed backup request in the reset flow sends
          // an "other" code, so it's the best we can do unless we update the firmware
          const isRecoverySeedBackupRequest =
            from_wallet &&
            message.code === ButtonRequestType.OTHER &&
            disposition === 'initializing'
          fnLogger.trace(
            { disposition, from_wallet, isRecoverySeedBackupRequest },
            'isRecoverySeedBackupRequest',
          )
          if (isRecoverySeedBackupRequest) {
            dispatch({
              type: WalletActions.OPEN_KEEPKEY_RECOVERY,
              payload: { deviceId },
            })
          }
          break
        case MessageType.PASSPHRASEREQUEST:
          dispatch({
            type: WalletActions.OPEN_KEEPKEY_PASSPHRASE,
            payload: { deviceId },
          })
          break
        // ACK just means we sent it, doesn't mean it was successful
        case MessageType.PASSPHRASEACK:
          if (modal) dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

          // KeepKey doesn't send a successfull response on passphrase sent request
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
                showBackButton: disposition !== 'initialized',
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
              fnLogger.warn('PIN Cancelled')
              break
            case FailureType.ACTIONCANCELLED:
              fnLogger.debug('Action Cancelled')
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
                  fnLogger.warn('Passphrase canceled')
                  setDeviceState({ awaitingDeviceInteraction: false })
                  dispatch({
                    type: WalletActions.SET_WALLET_MODAL,
                    payload: true,
                  })
                }
              })()
              break
            case FailureType.SYNTAXERROR:
              moduleLogger.warn(
                'KeepKey Event [FAILURE]: Invalid mnemonic, are words in correct order?',
              )
              dispatch({
                type: WalletActions.OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE,
                payload: {
                  deviceId,
                },
              })
              break
            default:
              fnLogger.warn('Unexpected MessageType')
              setDeviceState({ lastDeviceInteractionStatus: 'error' })
              break
          }
          break
        default:
          // Ignore unhandled events
          fnLogger.trace('Unhandled Event')
      }
    }

    const handleConnect = async (deviceId: string) => {
      moduleLogger.info({ deviceId, fn: 'handleConnect' }, 'Device Connected')
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
          console.log('handle connect')
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              deviceId: id,
              meta: { label: name },
              icon: state.walletInfo.icon, // We're reconnecting the same wallet so we can reuse the walletInfo
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        }
      } catch (e) {
        moduleLogger.error(e, { fn: 'handleConnect' }, 'Device Connected Error')
      }
    }

    const handleDisconnect = async (deviceId: string) => {
      moduleLogger.info({ deviceId, fn: 'handleDisconnect' }, 'Device Disconnected')
      try {
        const id = keyring.getAlias(deviceId)
        if (id === state.walletInfo?.deviceId) {
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
        }
        if (modal) {
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          disconnect()
        }
      } catch (e) {
        moduleLogger.error(e, { fn: 'handleDisconnect' }, 'Device Disconnected Error')
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
    disconnect,
    isUpdatingPin,
    modal,
    state.walletInfo,
    setDeviceState,
    disposition,
    toast,
    translate,
  ])
}
