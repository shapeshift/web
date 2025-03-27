import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConnectModal } from '../../components/ConnectModal'
import { CoinbaseConfig } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const CoinbaseConnect = () => {
  const navigate = useNavigate()
  const { dispatch, getAdapter } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = (e: string | null) => {
    setError(e)
    setLoading(false)
  }

  const localWallet = useLocalWallet()

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const adapter = await getAdapter(KeyManager.Coinbase)
    if (adapter) {
      try {
        const wallet = await adapter.pairDevice()
        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-coinbase::pairDevice returned null or undefined')
        }

        const { name, icon } = CoinbaseConfig
        const deviceId = await wallet.getDeviceID()
        const isLocked = await wallet.isLocked()
        await wallet.initialize()
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Coinbase },
        })
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })
        localWallet.setLocalWallet({ type: KeyManager.Coinbase, deviceId })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        console.error(e, 'Coinbase Connect: There was an error initializing the wallet')
        setErrorLoading(e.message)
        navigate('/coinbase/failure')
      }
    }
    setLoading(false)
  }, [dispatch, getAdapter, navigate, localWallet])

  return (
    <ConnectModal
      headerText={'walletProvider.coinbase.connect.header'}
      bodyText={'walletProvider.coinbase.connect.body'}
      buttonText={'walletProvider.coinbase.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
