import { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { getConfig } from 'config'
import React, { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { RouteComponentProps } from 'react-router-dom'
import { ActionTypes, WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { ConnectModal } from '../../components/ConnectModal'
import { RedirectModal } from '../../components/RedirectModal'
import { LocationState } from '../../NativeWallet/types'
import { WalletConnectConfig } from '../config'

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
export const WalletConnectConnect = ({ history }: WalletConnectSetupProps) => {
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<WalletConnectProvider>()

  const setErrorLoading = (e: string | null) => {
    setError(e)
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const rpcUrl = getConfig().REACT_APP_ETHEREUM_NODE_URL
        if (!rpcUrl) {
          console.error('ConfigNotFound: ethereum node url not set')
          return
        }
        const opts = {
          rpc: {
            1: rpcUrl,
          },
        }
        setProvider(new WalletConnectProvider(opts))
      } catch (e) {
        if (!isMobile) console.error(e)
      }
    })()
  }, [setProvider])

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    if (!provider) {
      throw new Error('walletProvider.walletConnect.errors.connectFailure')
    }

    if (state.adapters && state.adapters?.has(KeyManager.WalletConnect)) {
      const wallet = (await state.adapters
        .get(KeyManager.WalletConnect)
        ?.pairDevice()) as WalletConnectHDWallet
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-walletconnect::pairDevice returned null or undefined')
      }

      const { name, icon } = WalletConnectConfig
      try {
        const deviceId = await wallet.getDeviceID()

        provider.onConnect(async () => {
          const { connected } = await provider.getWalletConnector()
          console.info(`connector connected: ${connected}`)
        })

        //  Enable session (triggers QR Code modal)
        await provider.enable()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.WalletConnect, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        if (e?.message?.startsWith('walletProvider.')) {
          console.error('WalletConnect Connect: There was an error initializing the wallet', e)
          setErrorLoading(e?.message)
        } else {
          setErrorLoading('walletProvider.walletConnect.errors.unknown')
          history.push('/walletconnect/failure')
        }
      }
    }
    setLoading(false)
  }

  // This constructs the WalletConnect deep-linking target from the currently-loaded
  // window.location. The port will be blank if not specified, in which case it
  // should be omitted.
  const mmDeeplinkTarget = [window.location.hostname, window.location.port]
    .filter(x => !!x)
    .join(':')

  // TODO: test native app
  // The WalletConnect mobile app itself injects a provider, so we'll use pairDevice once
  // we've reopened ourselves in that environment.
  return !provider && isMobile ? (
    <RedirectModal
      headerText={'walletProvider.walletConnect.redirect.header'}
      bodyText={'walletProvider.walletConnect.redirect.body'}
      buttonText={'walletProvider.walletConnect.redirect.button'}
      onClickAction={(): any => {
        window.location.assign(`https://walletconnect.app.link/dapp/${mmDeeplinkTarget}`)
      }}
      loading={loading}
      error={error}
    ></RedirectModal>
  ) : (
    <ConnectModal
      headerText={'walletProvider.walletConnect.connect.header'}
      bodyText={'walletProvider.walletConnect.connect.body'}
      buttonText={'walletProvider.walletConnect.connect.button'}
      pairDevice={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
