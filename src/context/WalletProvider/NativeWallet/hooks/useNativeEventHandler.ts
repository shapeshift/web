import type { Event } from '@shapeshiftoss/hdwallet-core'
import { NativeEvents } from '@shapeshiftoss/hdwallet-native'
import type { Dispatch } from 'react'
import { useEffect } from 'react'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import type { InitialState } from 'context/WalletProvider/WalletProvider'
import { isMobile as isMobileApp } from 'lib/globals'
import { assertUnreachable } from 'lib/utils'

export const useNativeEventHandler = (state: InitialState, dispatch: Dispatch<ActionTypes>) => {
  const { keyring, modal, modalType } = state

  useEffect(() => {
    const handleEvent = (e: [deviceId: string, message: Event]) => {
      const deviceId = e[0]
      const messageType = e[1].message_type as NativeEvents
      switch (messageType) {
        case NativeEvents.MNEMONIC_REQUIRED:
          if (!deviceId) break

          // Don't show password input for previous wallet when switching
          if (deviceId !== state.nativeWalletPendingDeviceId) {
            break
          }

          console.log({
            nativeWalletPendingDeviceId: state.nativeWalletPendingDeviceId,
            deviceId: state.deviceId,
          })

          // If we're on the native mobile app we don't need to handle the MNEMONIC_REQUIRED event as we use the device's native authentication instead
          // Reacting to this event will incorrectly open the native password modal after authentication completes when on the mobile app
          if (isMobileApp) break
          dispatch({ type: WalletActions.NATIVE_PASSWORD_OPEN, payload: { modal: true } })

          break
        case NativeEvents.READY:
          if (modal) {
            dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          }
          break
        default:
          assertUnreachable(messageType)
      }
    }

    /*
      Ideally we'd only listen to these events if modalType is KeyManager.Native or KeyManager.Mobile.
      // TODO(gomes): is this comment still valid after the wallet.getAdapter() refactor
      Unfortunately, state.adapters is set in the React event loop via a useEffect, and so is null on initial load.
      This prevents SET_CONNECTOR_TYPE from being dispatched on the first WalletProvider.load() cycle, which means we'd
      miss the NativeEvents.MNEMONIC_REQUIRED event.
     */
    if (keyring) {
      keyring.on(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], handleEvent)
      keyring.on(['Native', '*', NativeEvents.READY], handleEvent)
    }
    return () => {
      keyring.off(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], handleEvent)
      keyring.off(['Native', '*', NativeEvents.READY], handleEvent)
    }
  }, [modalType, dispatch, keyring, modal, state.nativeWalletPendingDeviceId, state.deviceId])
}
