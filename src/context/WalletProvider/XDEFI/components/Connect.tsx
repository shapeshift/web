import type { XDEFIHDWallet } from '@shapeshiftoss/hdwallet-xdefi'
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
import { XDEFIConfig } from '../config'

export interface XDEFISetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const XDEFIConnect = ({ history }: XDEFISetupProps) => {
  const { setLocalWalletTypeAndDeviceId } = useLocalWallet()
  const { dispatch, state, getAdapter, onProviderChange } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const adapter = await getAdapter(KeyManager.XDefi)
    if (adapter) {
      try {
        // Remove all provider event listeners from previously connected wallets
        await removeAccountsAndChainListeners()

        const wallet = (await adapter.pairDevice()) as XDEFIHDWallet | undefined
        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-xdefi::pairDevice returned null or undefined')
        }

        await onProviderChange(KeyManager.XDefi, wallet)

        const { name, icon } = XDEFIConfig

        const deviceId = await wallet.getDeviceID()

        if (state.provider !== (globalThis as any).xfi.ethereum) {
          throw new Error('walletProvider.xdefi.errors.multipleWallets')
        }

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.XDefi },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.XDefi, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        if (e?.message?.startsWith('walletProvider.')) {
          console.error(e)
          setErrorLoading(e?.message)
        } else {
          setErrorLoading('walletProvider.xdefi.errors.unknown')
          history.push('/xdefi/failure')
          // Safely navigate user to website if XDEFI is not found
          if (e?.message === 'XDEFI provider not found') {
            const newWindow = window.open('https://xdefi.io', '_blank', 'noopener noreferrer')
            if (newWindow) newWindow.opener = null
          }
        }
      }
    }
    setLoading(false)
  }, [
    onProviderChange,
    getAdapter,
    state.provider,
    dispatch,
    setLocalWalletTypeAndDeviceId,
    history,
  ])

  return (
    <ConnectModal
      headerText={'walletProvider.xdefi.connect.header'}
      bodyText={'walletProvider.xdefi.connect.body'}
      buttonText={'walletProvider.xdefi.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
