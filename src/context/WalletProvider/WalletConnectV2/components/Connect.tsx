import { clearWalletConnectLocalStorage } from 'plugins/walletConnectToDapps/utils/clearAllWalletConnectToDappsSessions'
import React, { useCallback, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { ConnectModal } from 'context/WalletProvider/components/ConnectModal'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { WalletConnectV2Config } from 'context/WalletProvider/WalletConnectV2/config'
import { WalletNotFoundError } from 'context/WalletProvider/WalletConnectV2/Error'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { LocationState } from '../../NativeWallet/types'

export interface WalletConnectSetupProps extends RouteComponentProps<{}, {}, LocationState> {
  dispatch: React.Dispatch<ActionTypes>
}

export const WalletConnectV2Connect = ({ history }: WalletConnectSetupProps) => {
  // Sometimes the Web3Modal doesn't trigger if there is already wc things in local storage.
  // This is a bit blunt, and we might want to consider a more targeted approach.
  // https://github.com/orgs/WalletConnect/discussions/3010
  clearWalletConnectLocalStorage()
  const { dispatch, state, onProviderChange } = useWallet()
  const [loading, setLoading] = useState(false)

  const pairDevice = useCallback(async () => {
    setLoading(true)
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    // onProviderChange will trigger the Web3Modal
    await onProviderChange(KeyManager.WalletConnectV2)
    try {
      if (state.adapters && state.adapters?.has(KeyManager.WalletConnectV2)) {
        const wallet = await state.adapters.get(KeyManager.WalletConnectV2)?.[0]?.pairDevice()

        if (!wallet) {
          throw new WalletNotFoundError()
        }

        setLoading(true)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

        const { name, icon } = WalletConnectV2Config
        const deviceId = await wallet.getDeviceID()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.WalletConnectV2 },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.WalletConnectV2, deviceId)
      }
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      if (e instanceof WalletNotFoundError) {
        console.error(e)
      } else {
        history.push('/walletconnect/failure')
      }
    }
  }, [dispatch, history, onProviderChange, state.adapters])

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
