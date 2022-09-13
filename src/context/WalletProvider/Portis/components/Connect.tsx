import React, { useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import { PortisConfig } from '../config'
const moduleLogger = logger.child({ namespace: ['Connect'] })

export interface PortisSetupProps
  extends RouteComponentProps<
    {},
    any // history
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const PortisConnect = ({ history }: PortisSetupProps) => {
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = async () => {
    setError(null)
    setLoading(true)
    if (state.adapters && state.adapters?.has(KeyManager.Portis)) {
      const wallet = await state.adapters.get(KeyManager.Portis)?.pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-portis::pairDevice returned null or undefined')
      }

      const { name, icon } = PortisConfig
      try {
        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId: 'test' },
        })
        dispatch({ type: WalletActions.SET_IS_DEMO_WALLET, payload: false })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.Portis, 'test')
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        moduleLogger.error(e, 'Portis Connect: There was an error initializing the wallet')
        setErrorLoading('walletProvider.portis.errors.unknown')
        history.push('/portis/failure')
      }
    }
    setLoading(false)
  }

  return (
    <ConnectModal
      headerText={'walletProvider.portis.connect.header'}
      bodyText={'walletProvider.portis.connect.body'}
      buttonText={'walletProvider.portis.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
