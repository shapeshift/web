import React, { useCallback, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { removeAccountsAndChainListeners } from 'context/WalletProvider/WalletProvider'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'

import { ConnectModal } from '../../components/ConnectModal'
import { LedgerConfig } from '../config'

export interface LedgerSetupProps
  extends RouteComponentProps<
    {},
    any // history
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const LedgerConnect = ({ history }: LedgerSetupProps) => {
  const { dispatch: walletDispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const isLedgerAccountManagementEnabled = useFeatureFlag('AccountManagementLedger')

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const adapter = await getAdapter(KeyManager.Ledger)
    if (adapter) {
      try {
        // Remove all provider event listeners from previously connected wallets
        await removeAccountsAndChainListeners()

        const wallet = await adapter.pairDevice()

        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-ledger::pairDevice returned null or undefined')
        }

        const { name, icon } = LedgerConfig
        // TODO(gomes): this is most likely wrong, all Ledger devices get the same device ID
        const deviceId = await wallet.getDeviceID()

        walletDispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Ledger },
        })
        walletDispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        localWallet.setLocalWalletTypeAndDeviceId(KeyManager.Ledger, deviceId)

        // If account management is enabled, exit the WalletProvider context, which doesn't have access to the ModalProvider
        // The Account drawer will be opened further down the tree
        if (isAccountManagementEnabled && isLedgerAccountManagementEnabled) {
          walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        } else {
          history.push('/ledger/chains')
        }
      } catch (e: any) {
        console.error(e)
        setErrorLoading(e?.message || 'walletProvider.ledger.errors.unknown')
        history.push('/ledger/failure')
      }
    }
    setLoading(false)
  }, [
    getAdapter,
    history,
    isAccountManagementEnabled,
    isLedgerAccountManagementEnabled,
    localWallet,
    setErrorLoading,
    walletDispatch,
  ])

  return (
    <ConnectModal
      headerText={'walletProvider.ledger.connect.header'}
      bodyText={'walletProvider.ledger.connect.body'}
      buttonText={'walletProvider.ledger.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
