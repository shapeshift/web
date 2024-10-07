import React, { useCallback, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { removeAccountsAndChainListeners } from 'context/WalletProvider/WalletProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { ConnectModal } from '../../components/ConnectModal'
import type { LocationState } from '../../NativeWallet/types'
import { PhantomConfig } from '../config'

export interface PhantomSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const PhantomConnect = ({ history }: PhantomSetupProps) => {
  const { state, dispatch, getAdapter, onProviderChange } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const adapter = await getAdapter(KeyManager.Phantom)
    if (adapter) {
      try {
        // Remove all provider event listeners from previously connected wallets
        await removeAccountsAndChainListeners()

        const wallet = await adapter.pairDevice()
        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-phantom::pairDevice returned null or undefined')
        }

        await onProviderChange(KeyManager.Phantom, wallet)

        const { name, icon } = PhantomConfig
        const deviceId = await wallet.getDeviceID()
        const isLocked = await wallet.isLocked()
        await wallet.initialize()
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Phantom },
        })
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: { isConnected: true, modalType: state.modalType },
        })
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })
        localWallet.setLocalWallet(KeyManager.Phantom, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        console.error(e, 'Phantom Connect: There was an error initializing the wallet')
        setErrorLoading(e.message)
        history.push('/phantom/failure')
      }
    }
    setLoading(false)
  }, [
    dispatch,
    getAdapter,
    history,
    localWallet,
    onProviderChange,
    setErrorLoading,
    state.modalType,
  ])

  return (
    <ConnectModal
      headerText={'walletProvider.phantom.connect.header'}
      bodyText={'walletProvider.phantom.connect.body'}
      buttonText={'walletProvider.phantom.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
