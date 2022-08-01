import detectEthereumProvider from '@metamask/detect-provider'
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
import { MetaMaskConfig } from '../config'

export interface MetaMaskSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const MetaMaskConnect = ({ history }: MetaMaskSetupProps) => {
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<any>()

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  useEffect(() => {
    ;(async () => {
      try {
        setProvider(await detectEthereumProvider())
      } catch (e) {
        if (!isMobile) console.error(e)
      }
    })()
  }, [setProvider])

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    if (!provider) {
      throw new Error('walletProvider.metaMask.errors.connectFailure')
    }

    //Handles UX issues caused by MM and Tally Ho both being injected.
    if (provider.isTally) {
      setErrorLoading('walletProvider.metaMask.errors.tallyInstalledAndSetToDefault')
      throw new Error('Tally Ho wallet installed and set as default')
    }

    if (state.adapters && state.adapters?.has(KeyManager.MetaMask)) {
      const wallet = await state.adapters.get(KeyManager.MetaMask)?.pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-metamask::pairDevice returned null or undefined')
      }

      const { name, icon } = MetaMaskConfig
      try {
        const deviceId = await wallet.getDeviceID()

        // Hack to handle MetaMask account changes
        //TODO: handle this properly
        const resetState = () => dispatch({ type: WalletActions.RESET_STATE })
        provider?.on?.('accountsChanged', resetState)
        provider?.on?.('chainChanged', resetState)
        const isLocked = await wallet.isLocked()

        const oldDisconnect = wallet.disconnect.bind(wallet)
        wallet.disconnect = () => {
          provider?.removeListener?.('accountsChanged', resetState)
          provider?.removeListener?.('chainChanged', resetState)
          return oldDisconnect()
        }

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })
        setLocalWalletTypeAndDeviceId(KeyManager.MetaMask, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        if (e?.message?.startsWith('walletProvider.')) {
          console.error('MetaMask Connect: There was an error initializing the wallet', e)
          setErrorLoading(e?.message)
        } else {
          setErrorLoading('walletProvider.metaMask.errors.unknown')
          history.push('/metamask/failure')
        }
      }
    }
    setLoading(false)
  }

  // This constructs the MetaMask deep-linking target from the currently-loaded
  // window.location. The port will be blank if not specified, in which case it
  // should be omitted.
  const mmDeeplinkTarget = [window.location.hostname, window.location.port]
    .filter(x => !!x)
    .join(':')

  // The MM mobile app itself injects a provider, so we'll use pairDevice once
  // we've reopened ourselves in that environment.
  return !provider && isMobile ? (
    <RedirectModal
      headerText={'walletProvider.metaMask.redirect.header'}
      bodyText={'walletProvider.metaMask.redirect.body'}
      buttonText={'walletProvider.metaMask.redirect.button'}
      onClickAction={(): any => {
        window.location.assign(`https://metamask.app.link/dapp/${mmDeeplinkTarget}`)
      }}
      loading={loading}
      error={error}
    ></RedirectModal>
  ) : (
    <ConnectModal
      headerText={'walletProvider.metaMask.connect.header'}
      bodyText={'walletProvider.metaMask.connect.body'}
      buttonText={'walletProvider.metaMask.connect.button'}
      pairDevice={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
