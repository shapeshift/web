import React, { useState } from 'react'
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
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = async () => {
    setError(null)
    setLoading(true)
    if (state.adapters && state.adapters?.has(KeyManager.Ledger)) {
      const wallet = await state.adapters.get(KeyManager.Ledger)?.[0].pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-ledger::pairDevice returned null or undefined')
      }

      const { name, icon } = LedgerConfig
      try {
        await wallet.initialize()
        // TODO(gomes): this is most likely wrong, all Ledger devices get the same device ID
        const deviceId = await wallet.getDeviceID()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Ledger },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.Ledger, deviceId)
        history.push('/ledger/chains')
      } catch (e: any) {
        console.error(e)
        setErrorLoading(e?.message || 'walletProvider.ledger.errors.unknown')
        history.push('/ledger/failure')
      }
    }
    setLoading(false)
  }

  return (
    <ConnectModal
      headerText={'walletProvider.ledger.connect.header'}
      bodyText={'walletProvider.ledger.connect.body'}
      buttonText={'walletProvider.ledger.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
