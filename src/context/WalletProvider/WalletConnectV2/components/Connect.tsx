import React, { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { WalletConnectConfig } from 'context/WalletProvider/WalletConnect/config'
import { WalletNotFoundError } from 'context/WalletProvider/WalletConnect/Error'
import { useWallet } from 'hooks/useWallet/useWallet'

import { ConnectModal } from '../../components/ConnectModal'
import type { LocationState } from '../../NativeWallet/types'

export interface WalletConnectSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

/**
 * WalletConnect Connect component
 *
 * Test WalletConnect Tool: https://test.walletconnect.org/
 */
export const WalletConnectV2Connect = ({ history }: WalletConnectSetupProps) => {
  const { dispatch, state, onProviderChange } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const translate = useTranslate()

  const setErrorLoading = (e: string | null) => {
    setError(e)
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      await onProviderChange(KeyManager.WalletConnectV2)
    })()
  }, [onProviderChange])

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    if (!(state.provider && 'connector' in state.provider)) {
      throw new Error('walletProvider.walletconnect.errors.connectFailure')
    }

    try {
      state.provider.connector.on('disconnect', () => {
        // Handle WalletConnect session rejection
        history.push('/walletconnect/failure')
      })

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
        setErrorLoading(translate(e.message))
      } else {
        history.push('/walletconnect/failure')
      }
    }
  }

  // The WalletConnect modal handles desktop and mobile detection as well as deep linking
  return (
    <ConnectModal
      headerText={'walletProvider.walletConnect.connect.header'}
      bodyText={'walletProvider.walletConnect.connect.body'}
      buttonText={'walletProvider.walletConnect.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
