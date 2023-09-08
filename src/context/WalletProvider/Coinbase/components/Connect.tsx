import React, { useEffect, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { ConnectModal } from '../../components/ConnectModal'
import type { LocationState } from '../../NativeWallet/types'
import { CoinbaseConfig } from '../config'

export interface CoinbaseSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const CoinbaseConnect = ({ history }: CoinbaseSetupProps) => {
  const { dispatch, state, onProviderChange } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = (e: string | null) => {
    setError(e)
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      await onProviderChange(KeyManager.Coinbase)
    })()
  }, [onProviderChange])

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    if (state.adapters && state.adapters?.has(KeyManager.Coinbase)) {
      try {
        const wallet = await state.adapters.get(KeyManager.Coinbase)?.[0].pairDevice()
        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-coinbase::pairDevice returned null or undefined')
        }
        const { name, icon } = CoinbaseConfig
        const deviceId = await wallet.getDeviceID()
        const isLocked = await wallet.isLocked()
        await wallet.initialize()
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Coinbase },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })
        setLocalWalletTypeAndDeviceId(KeyManager.Coinbase, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        console.error(e, 'Coinbase Connect: There was an error initializing the wallet')
        setErrorLoading(e.message)
        history.push('/coinbase/failure')
      }
    }
    setLoading(false)
  }

  return (
    <ConnectModal
      headerText={'walletProvider.coinbase.connect.header'}
      bodyText={'walletProvider.coinbase.connect.body'}
      buttonText={'walletProvider.coinbase.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
