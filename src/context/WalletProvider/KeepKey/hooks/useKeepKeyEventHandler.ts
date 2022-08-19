import { useToast } from '@chakra-ui/toast'
import { Event, Events } from '@shapeshiftoss/hdwallet-core'
import { Dispatch, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { ActionTypes, WalletActions } from 'context/WalletProvider/actions'
import { DeviceState, InitialState } from 'context/WalletProvider/WalletProvider'
import { logger } from 'lib/logger'

import { ButtonRequestType, FailureType, MessageType } from '../KeepKeyTypes'

const moduleLogger = logger.child({ namespace: ['useKeepKeyEventHandler'] })

export const useKeepKeyEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
  loadWallet: () => void,
  setDeviceState: (deviceState: Partial<DeviceState>) => void,
) => {
  const {
    keyring,
    modal,
    deviceState: { disposition },
  } = state

  const toast = useToast()
  const translate = useTranslate()

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      const [deviceId, event] = e
      const { message_enum, message, from_wallet } = event
      const fnLogger = moduleLogger.child({
        namespace: ['handleEvent'],
        defaultFields: { deviceId, event },
      })
      fnLogger.trace('Handling Event')

      switch (message_enum) {
        case MessageType.SUCCESS:
          fnLogger.trace(message.message)
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
          fnLogger.trace(
            { disposition, from_wallet, isRecoverySeedBackupRequest },
            'isRecoverySeedBackupRequest',
          )
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
          break
        case MessageType.PINMATRIXREQUEST:
          setDeviceState({ awaitingDeviceInteraction: false })
          dispatch({
            type: WalletActions.OPEN_KEEPKEY_PIN,
            payload: {
              deviceId,
              pinRequestType: message?.type,
              showBackButton: disposition !== 'initialized',
            },
          })
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
                  dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
                } else {
                  fnLogger.warn('Device not initialized')
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
              console.warn('KeepKey Event [FAILURE]: Invalid mnemonic, are words in correct order?')
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
          dispatch({ type: WalletActions.SET_IS_DEMO_WALLET, payload: false })
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
          // Little trick to send the user back to the wallet select route
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
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
    loadWallet,
    modal,
    state.walletInfo,
    setDeviceState,
    disposition,
    toast,
    translate,
  ])
}
