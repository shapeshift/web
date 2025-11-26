import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConnectModal } from '../../components/ConnectModal'
import { VultisigConfig } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const VultisigConnect = () => {
  const navigate = useNavigate()
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const adapter = await getAdapter(KeyManager.Vultisig)
    if (adapter) {
      try {
        const wallet = await adapter.pairDevice()
        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-vultisig::pairDevice returned null or undefined')
        }

        const { name, icon } = VultisigConfig
        const deviceId = await wallet.getDeviceID()
        const isLocked = await wallet.isLocked()
        await wallet.initialize()
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Vultisig },
        })
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })
        localWallet.setLocalWallet({ type: KeyManager.Vultisig, deviceId })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        console.error(e, 'Vultisig Connect: There was an error initializing the wallet')
        setErrorLoading(e.message)
        navigate('/vultisig/failure')
      }
    }
    setLoading(false)
  }, [dispatch, getAdapter, navigate, localWallet, setErrorLoading])

  return (
    <ConnectModal
      headerText={'walletProvider.vultisig.connect.header'}
      bodyText={'walletProvider.vultisig.connect.body'}
      buttonText={'walletProvider.vultisig.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
