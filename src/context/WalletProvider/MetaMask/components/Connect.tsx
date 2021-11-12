import React, { useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'

import { ConnectModal } from '../../components/ConnectModal'
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

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId }
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        history.push('/metamask/success')
      } catch (e) {
        console.error('MetaMask Connect: There was an error initializing the wallet', e)
        setErrorLoading('walletProvider.metaMask.errors.unknown')
        history.push('/metamask/failure')
      }
    }
    setLoading(false)
  }

  return (
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
