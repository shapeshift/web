import { WebUSBLedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import React, { useCallback, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
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
  const { dispatch: walletDispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)
    const currentAdapters = state.adapters ?? new Map()
    // eslint is drunk, this isn't a hook
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ledgerAdapter = WebUSBLedgerAdapter.useKeyring(state.keyring)
    // This is conventionally done in WalletProvider effect, but won't work here, as `requestDevice()` needs to be called from a user interaction
    // So we do it in this pairDevice() method instead and set the adapters the same as we would do in WalletProvider
    try {
      const wallet = await ledgerAdapter.pairDevice()
      try {
        currentAdapters.set(KeyManager.Ledger, [ledgerAdapter])
        walletDispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
      } catch (e) {
        console.error(e)
      }

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
      setLocalWalletTypeAndDeviceId(KeyManager.Ledger, deviceId)
      history.push('/ledger/chains')
    } catch (e: any) {
      console.error(e)
      setErrorLoading(e?.message || 'walletProvider.ledger.errors.unknown')
      history.push('/ledger/failure')
    }
    setLoading(false)
  }, [history, setErrorLoading, state.adapters, state.keyring, walletDispatch])

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
