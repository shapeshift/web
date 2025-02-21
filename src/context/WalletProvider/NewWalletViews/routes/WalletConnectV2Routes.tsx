import type EthereumProvider from '@walletconnect/ethereum-provider'
import { useCallback, useState } from 'react'
import type { RouteComponentProps, StaticContext } from 'react-router-dom'
import { Route, Switch } from 'react-router-dom'

import { PairBody } from '../components/PairBody'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { WalletConnectV2Config } from '@/context/WalletProvider/WalletConnectV2/config'
import { WalletNotFoundError } from '@/context/WalletProvider/WalletConnectV2/Error'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isWalletConnectWallet } from '@/lib/utils'
import { clearWalletConnectLocalStorage } from '@/plugins/walletConnectToDapps/utils/clearAllWalletConnectToDappsSessions'

const Icon = WalletConnectV2Config.icon
const icon = <Icon boxSize='64px' />

export type WalletConnectSetupProps = RouteComponentProps<{}, StaticContext, unknown>

export const NewWalletConnectV2Connect = ({ history }: WalletConnectSetupProps) => {
  const { dispatch, state, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pairDevice = useCallback(async () => {
    clearWalletConnectLocalStorage()
    setError(null)
    setLoading(true)
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

    const adapter = await getAdapter(KeyManager.WalletConnectV2)

    try {
      if (adapter) {
        if (!state.wallet || !isWalletConnectWallet(state.wallet)) {
          // trigger the web3 modal
          const wallet = await adapter.pairDevice()

          if (!wallet) throw new WalletNotFoundError()

          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
          dispatch({
            type: WalletActions.SET_WCV2_PROVIDER,
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
            payload: true,
          })
          localWallet.setLocalWallet({ type: KeyManager.WalletConnectV2, deviceId })
        }
      }
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      if (e instanceof WalletNotFoundError) {
        console.error(e)
        setError('walletProvider.errors.walletNotFound')
      } else {
        setError('walletProvider.walletConnect.errors.unknown')
        history.push('/walletconnect/failure')
      }
    } finally {
      setLoading(false)
    }
  }, [dispatch, getAdapter, history, localWallet, state.wallet])

  return (
    <PairBody
      icon={icon}
      headerTranslation='walletProvider.walletConnect.connect.header'
      bodyTranslation='walletProvider.walletConnect.connect.body'
      buttonTranslation='walletProvider.walletConnect.connect.button'
      isLoading={loading}
      error={error}
      onPairDeviceClick={pairDevice}
    />
  )
}

export const WalletConnectV2Routes = () => {
  const {
    state: { modalType },
  } = useWallet()

  const render = useCallback(
    (routeProps: RouteComponentProps<{}, StaticContext, unknown>) => (
      <NewWalletConnectV2Connect {...routeProps} />
    ),
    [],
  )

  if (!modalType) return null

  return (
    <Switch>
      <Route path='*' render={render} />
    </Switch>
  )
}
