import { XDEFIHDWallet } from '@shapeshiftoss/hdwallet-xdefi'
import React, { useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { ActionTypes, WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import { LocationState } from '../../NativeWallet/types'
import { XDEFIConfig } from '../config'
const moduleLogger = logger.child({ namespace: ['Connect'] })

export interface XDEFISetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const XDEFIConnect = ({ history }: XDEFISetupProps) => {
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  let provider: any

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    try {
      provider = (globalThis as any).xfi && (globalThis as any).xfi.ethereum
    } catch (error) {
      throw new Error('walletProvider.xdefi.errors.connectFailure')
    }

    if (state.adapters && state.adapters?.has(KeyManager.XDefi)) {
      try {
        const wallet = (await state.adapters.get(KeyManager.XDefi)?.pairDevice()) as
          | XDEFIHDWallet
          | undefined
        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-xdefi::pairDevice returned null or undefined')
        }

        const { name, icon } = XDEFIConfig

        const deviceId = await wallet.getDeviceID()

        if (provider !== (globalThis as any).xfi.ethereum) {
          throw new Error('walletProvider.xdefi.errors.multipleWallets')
        }

        // Hack to handle XDEFI account changes
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
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.XDefi, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        if (e?.message?.startsWith('walletProvider.')) {
          moduleLogger.error(e, 'XDEFI Connect: There was an error initializing the wallet')
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
  }

  return (
    <ConnectModal
      headerText={'walletProvider.xdefi.connect.header'}
      bodyText={'walletProvider.xdefi.connect.body'}
      buttonText={'walletProvider.xdefi.connect.button'}
      pairDevice={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
