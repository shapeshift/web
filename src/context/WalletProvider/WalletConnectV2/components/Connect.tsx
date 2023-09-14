import type React from 'react'
import { useCallback, useEffect } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { WalletConnectConfig } from 'context/WalletProvider/WalletConnect/config'
import { WalletNotFoundError } from 'context/WalletProvider/WalletConnect/Error'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { LocationState } from '../../NativeWallet/types'

export interface WalletConnectSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export function clearWalletConnectLocalStorage() {
  const keysToRemove: string[] = []

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i) as string
    if (key.startsWith('wc@2')) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key)
  }
}

/**
 * WalletConnect Connect component
 *
 * Test WalletConnect Tool: https://test.walletconnect.org/
 */
export const WalletConnectV2Connect = ({ history }: WalletConnectSetupProps) => {
  const { dispatch, state, onProviderChange } = useWallet()

  const pairDevice = useCallback(async () => {
    try {
      if (state.adapters && state.adapters?.has(KeyManager.WalletConnectV2)) {
        const wallet = await state.adapters.get(KeyManager.WalletConnectV2)?.[0]?.pairDevice()

        if (!wallet) {
          throw new WalletNotFoundError()
        }

        const { name, icon } = WalletConnectConfig
        const deviceId = await wallet.getDeviceID()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.WalletConnectV2 },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.WalletConnectV2, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      }
    } catch (e: unknown) {
      if (e instanceof WalletNotFoundError) {
        console.error(e)
      } else {
        history.push('/walletconnect/failure')
      }
    }
  }, [dispatch, history, state])

  useEffect(() => {
    ;(async () => {
      // The Web3Modal doesn't trigger if there is already wc things in local storage
      // https://github.com/orgs/WalletConnect/discussions/3010
      clearWalletConnectLocalStorage()
      await onProviderChange(KeyManager.WalletConnectV2)
      await pairDevice()
    })()
  }, [onProviderChange, pairDevice])

  // The WalletConnect modal handles desktop and mobile detection as well as deep linking
  // TODO: this shouldn't even be a route?
  return null
}
