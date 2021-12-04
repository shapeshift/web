import detectEthereumProvider from '@metamask/detect-provider'
import { getConfig } from 'config'
import React, { useState } from 'react'
import { isMobile } from 'react-device-detect'
import { RouteComponentProps } from 'react-router-dom'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'

import { ConnectModal } from '../../components/ConnectModal'
import { RedirectModal } from '../../components/RedirectModal'
import { LocationState } from '../../NativeWallet/types'
import { ActionTypes, useWallet, WalletActions } from '../../WalletProvider'

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

  const provider: any = detectEthereumProvider()

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    if (state.adapters && state.adapters?.has(KeyManager.MetaMask)) {
      const wallet = await state.adapters.get(KeyManager.MetaMask)?.pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-metamask::pairDevice returned null or undefined')
      }

      const { name, icon } = SUPPORTED_WALLETS[KeyManager.MetaMask]
      try {
        const deviceId = await wallet.getDeviceID()

        if (provider !== window.ethereum) {
          throw new Error('walletProvider.metaMask.errors.multipleWallets')
        }

        if (provider?.chainId !== '0x1') {
          throw new Error('walletProvider.metaMask.errors.network')
        }

        // Hack to handle MetaMask account changes
        //TODO: handle this properly
        const resetState = () => dispatch({ type: WalletActions.RESET_STATE })
        provider?.on?.('accountsChanged', resetState)
        provider?.on?.('chainChanged', resetState)

        const oldDisconnect = wallet.disconnect.bind(wallet)
        wallet.disconnect = () => {
          provider?.removeListener?.('accountsChanged', resetState)
          provider?.removeListener?.('chainChanged', resetState)
          return oldDisconnect()
        }

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId }
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        history.push('/metamask/success')
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

  return isMobile ? (
    <RedirectModal
      headerText={'walletProvider.metaMask.redirect.header'}
      bodyText={'walletProvider.metaMask.redirect.body'}
      buttonText={'walletProvider.metaMask.redirect.button'}
      onClickAction={(): any => {
        window.location.assign(getConfig().REACT_APP_METAMASK_DEEPLINK_URL)
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
      autopair={true}
      error={error}
    ></ConnectModal>
  )
}
