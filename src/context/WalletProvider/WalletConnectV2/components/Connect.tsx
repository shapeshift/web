import type EthereumProvider from '@walletconnect/ethereum-provider'
import { clearWalletConnectLocalStorage } from 'plugins/walletConnectToDapps/utils/clearAllWalletConnectToDappsSessions'
import React, { useCallback, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { ConnectModal } from 'context/WalletProvider/components/ConnectModal'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { WalletConnectV2Config } from 'context/WalletProvider/WalletConnectV2/config'
import { WalletNotFoundError } from 'context/WalletProvider/WalletConnectV2/Error'
import { removeAccountsAndChainListeners } from 'context/WalletProvider/WalletProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isWalletConnectWallet } from 'lib/utils'

import type { LocationState } from '../../NativeWallet/types'

export interface WalletConnectSetupProps extends RouteComponentProps<{}, {}, LocationState> {
  dispatch: React.Dispatch<ActionTypes>
}

export const WalletConnectV2Connect = ({ history }: WalletConnectSetupProps) => {
  // Sometimes the Web3Modal doesn't trigger if there is already wc things in local storage.
  // This is a bit blunt, and we might want to consider a more targeted approach.
  // https://github.com/orgs/WalletConnect/discussions/3010
  clearWalletConnectLocalStorage()
  const { dispatch, state, getAdapter, onProviderChange } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)

  const pairDevice = useCallback(async () => {
    setLoading(true)
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

    const adapter = await getAdapter(KeyManager.WalletConnectV2)

    try {
      if (adapter) {
        if (!state.wallet || !isWalletConnectWallet(state.wallet)) {
          // Remove all provider event listeners from previously connected wallets
          await removeAccountsAndChainListeners()

          setLoading(true)

          // trigger the web3 modal
          const wallet = await adapter.pairDevice()

          if (!wallet) throw new WalletNotFoundError()

          onProviderChange(KeyManager.WalletConnectV2, wallet)

          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
          dispatch({
            type: WalletActions.SET_PROVIDER,
            payload: wallet.provider as unknown as EthereumProvider,
          })

          const { name, icon } = WalletConnectV2Config
          const deviceId = await wallet.getDeviceID()

          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name, icon, deviceId, connectedType: KeyManager.WalletConnectV2 },
          })
          dispatch({
            type: WalletActions.SET_IS_CONNECTED,
            payload: { isConnected: true, modalType: state.modalType },
          })
          localWallet.setLocalWallet({ type: KeyManager.WalletConnectV2, deviceId })
        }
      }
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      if (e instanceof WalletNotFoundError) {
        console.error(e)
      } else {
        history.push('/walletconnect/failure')
      }
    }
  }, [dispatch, getAdapter, history, localWallet, onProviderChange, state.modalType, state.wallet])

  return (
    <ConnectModal
      headerText={'walletProvider.walletConnect.connect.header'}
      bodyText={'walletProvider.walletConnect.connect.body'}
      buttonText={'walletProvider.walletConnect.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={null}
    />
  )
}
