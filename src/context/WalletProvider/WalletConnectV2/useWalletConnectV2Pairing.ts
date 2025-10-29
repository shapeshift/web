import type EthereumProvider from '@walletconnect/ethereum-provider'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { WalletConnectV2Config } from './config'
import { WalletNotFoundError } from './Error'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isWalletConnectWallet } from '@/lib/utils'
import { clearWalletConnectLocalStorage } from '@/plugins/walletConnectToDapps/utils/clearAllWalletConnectToDappsSessions'

export const useWalletConnectV2Pairing = () => {
  const { dispatch, getAdapter, state } = useWallet()
  const localWallet = useLocalWallet()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pairDevice = useCallback(async () => {
    clearWalletConnectLocalStorage()
    setError(null)
    setIsLoading(true)
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
        navigate('/walletconnect/failure')
      }
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, getAdapter, navigate, localWallet, state.wallet])

  return {
    pairDevice,
    isLoading,
    error,
  }
}

