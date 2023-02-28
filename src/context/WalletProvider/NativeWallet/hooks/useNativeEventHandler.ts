import type { Event } from '@shapeshiftoss/hdwallet-core'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { NativeEvents } from '@shapeshiftoss/hdwallet-native'
import type { Dispatch } from 'react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import type { InitialState } from 'context/WalletProvider/WalletProvider'
import { logger } from 'lib/logger'

import { NativeConfig } from '../config'

const moduleLogger = logger.child({ namespace: ['NativeWallet'] })

type KeyringState = Pick<
  InitialState,
  'keyring' | 'walletInfo' | 'modal' | 'adapters' | 'isLocked' | 'deviceId'
>

export const useNativeEventHandler = (state: KeyringState, dispatch: Dispatch<ActionTypes>) => {
  const { keyring, modal } = state
  const location = useLocation()
  const [hasDismissedNativePassword, setHasDismissedNativePassword] = useState<boolean>(false)

  useEffect(() => {
    const handleEvent = async (e: [deviceId: string, message: Event]) => {
      moduleLogger.info({ e }, 'Event')
      const deviceId = e[0]
      switch (e[1].message_type) {
        case NativeEvents.MNEMONIC_REQUIRED:
          if (!deviceId) break
          // A few things to note here
          // 1. Connecting a wallet in /connect-wallet is valid and shouldn't be prevented
          // 2. We're reacting on keyring state, so isLocked being falsy (il.e not set yet) is a good way to check we're dealing with the initial useEffect cycle here, but not enough:
          // 3. Since hooks aren't singletons, we need an additional safety
          // When this hook will render from a different context, then
          if (
            !['/connect-wallet', '/trade'].includes(location.pathname) &&
            !hasDismissedNativePassword
          ) {
            dispatch({ type: WalletActions.SET_NATIVE_DEVICE_ID, payload: true })
            if (state.deviceId) {
              setHasDismissedNativePassword(true)
              break
            }
            const adapters = state?.adapters?.get(KeyManager.Native)
            const { name, icon } = NativeConfig
            const wallet = (await adapters?.[0].pairDevice?.(deviceId)) as NativeHDWallet
            dispatch({
              type: WalletActions.SET_WALLET,
              payload: {
                wallet,
                name,
                icon,
                deviceId,
                meta: { label: 'TODO wallet label' },
              },
            })
            dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
            dispatch({ type: WalletActions.SET_IS_LOCKED, payload: true })
            dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
            break
          }
          dispatch({ type: WalletActions.NATIVE_PASSWORD_OPEN, payload: { modal: true, deviceId } })
          break
        case NativeEvents.READY:
          if (modal) {
            dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          }
          break
        default:
          // If there wasn't an enum value, then we'll check the message type
          moduleLogger.info({ e }, 'ShapeShift Wallet Unknown Event')
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
  }, [
    keyring,
    location.pathname,
    modal,
    state.deviceId,
    state?.adapters,
    dispatch,
    hasDismissedNativePassword,
  ])
}
