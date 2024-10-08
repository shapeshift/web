import React, { useCallback, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { removeAccountsAndChainListeners } from 'context/WalletProvider/WalletProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { ConnectModal } from '../../components/ConnectModal'
import { KeplrConfig } from '../config'

export interface KeplrSetupProps
  extends RouteComponentProps<
    {},
    any // history
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const KeplrConnect = ({ history }: KeplrSetupProps) => {
  const { state, dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)
    const adapter = await getAdapter(KeyManager.Keplr)
    if (adapter) {
      // Remove all provider event listeners from previously connected wallets
      await removeAccountsAndChainListeners()

      const wallet = await adapter.pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-keplr::pairDevice returned null or undefined')
      }

      const { name, icon } = KeplrConfig
      try {
        const provider = window.keplr
        if (!provider) {
          setErrorLoading('walletProvider.keplr.errors.noProvider')
          throw new Error('walletProvider.keplr.errors.noProvider')
        }

        await wallet.initialize()
        const deviceId = await wallet.getDeviceID()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Keplr },
        })
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: { isConnected: true, modalType: state.modalType },
        })
        localWallet.setLocalWallet({ type: KeyManager.Keplr, deviceId })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

        /** Reinitialize wallet when user changes accounts */
        /** TODO: See if we can handle this more gracefully.
         * Currently, this requires the user to re-pair Keplr Wallet on chain change.
         * Maybe this can be done without having to show the connect modal.
         */
        const resetState = () => dispatch({ type: WalletActions.RESET_STATE })
        window.addEventListener('keplr_keystorechange', resetState)
      } catch (e: any) {
        console.error(e)
        setErrorLoading(e?.message || 'walletProvider.keplr.errors.unknown')
        history.push('/keplr/failure')
      }
    }
    setLoading(false)
  }, [dispatch, getAdapter, history, localWallet, state.modalType])

  return (
    <ConnectModal
      headerText={'walletProvider.keplr.connect.header'}
      bodyText={'walletProvider.keplr.connect.body'}
      buttonText={'walletProvider.keplr.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
