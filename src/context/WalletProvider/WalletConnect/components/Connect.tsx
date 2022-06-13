import { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { getConfig } from 'config'
import React, { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps } from 'react-router-dom'
import { ActionTypes, WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import { LocationState } from '../../NativeWallet/types'
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

type WalletConnectProviderConfig =
  | {
      infuraId: string
    }
  | { rpc: { [key: number]: string } }

/**
 * WalletConnect Connect component
 *
 * Test WalletConnect Tool: https://test.walletconnect.org/
 */
export const WalletConnectConnect = ({ history }: WalletConnectSetupProps) => {
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const translate = useTranslate()

  const setErrorLoading = (e: string | null) => {
    setError(e)
    setLoading(false)
  }

  const pairDevice = async () => {
    try {
      setLoading(true)

      const rpcUrl = getConfig().REACT_APP_ETHEREUM_NODE_URL
      const config: WalletConnectProviderConfig = {
        rpc: {
          1: rpcUrl,
        },
      }

      const provider = new WalletConnectProvider(config)
      provider.connector.on('disconnect', () => {
        // Handle WalletConnect session rejection
        history.push('/walletconnect/failure')
      })

      if (state.adapters && state.adapters?.has(KeyManager.WalletConnect)) {
        const wallet = (await state.adapters
          .get(KeyManager.WalletConnect)
          ?.pairDevice(provider)) as WalletConnectHDWallet

        if (!wallet) {
          throw new WalletNotFoundError()
        }

        const { name, icon } = WalletConnectConfig
        const deviceId = await wallet.getDeviceID()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
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
      pairDevice={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
