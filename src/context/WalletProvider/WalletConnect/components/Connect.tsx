import type { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import React, { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import type { LocationState } from '../../NativeWallet/types'
import { WalletConnectConfig } from '../config'
import { WalletNotFoundError } from '../Error'

export interface WalletConnectSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

const moduleLogger = logger.child({
  namespace: ['WalletConnect', 'Components', 'Connect'],
})

/**
 * WalletConnect Connect component
 *
 * Test WalletConnect Tool: https://test.walletconnect.org/
 */
export const WalletConnectConnect = ({ history }: WalletConnectSetupProps) => {
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
      await onProviderChange(KeyManager.WalletConnect)
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

      if (state.adapters && state.adapters?.has(KeyManager.WalletConnect)) {
        const wallet = (await state.adapters
          .get(KeyManager.WalletConnect)
          ?.pairDevice()) as WalletConnectHDWallet

        if (!wallet) {
          throw new WalletNotFoundError()
        }

        const { name, icon } = WalletConnectConfig
        const deviceId = await wallet.getDeviceID()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_DEMO_WALLET, payload: false })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.WalletConnect, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      }
    } catch (e: unknown) {
      if (e instanceof WalletNotFoundError) {
        moduleLogger.error(
          e,
          { fn: 'pairDevice' },
          'WalletConnect Connect: There was an error initializing the wallet',
        )
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
