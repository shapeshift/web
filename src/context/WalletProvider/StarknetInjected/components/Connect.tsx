import type { StarknetInjectedErrorCode } from '@shapeshiftoss/hdwallet-starknet-injected'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ConnectModalProps } from '../../components/ConnectModal'
import { ConnectModal } from '../../components/ConnectModal'
import type { StarknetInjectedKeyManager } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const getErrorCode = (e: unknown): StarknetInjectedErrorCode | undefined =>
  (e as { code?: StarknetInjectedErrorCode } | undefined)?.code

export const StarknetInjectedConnect = ({
  keyManager,
}: {
  keyManager: StarknetInjectedKeyManager
}) => {
  const navigate = useNavigate()
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ConnectModalProps['error']>(null)

  const { name, icon } = SUPPORTED_WALLETS[keyManager]

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const adapter = await getAdapter(keyManager)
      if (!adapter) throw new Error('walletProvider.errors.walletNotFound')

      const wallet = await adapter.pairDevice()
      if (!wallet) throw new Error('walletProvider.errors.walletNotFound')

      const deviceId = await wallet.getDeviceID()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId, connectedType: keyManager },
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
      localWallet.setLocalWallet({ type: keyManager, deviceId, rdns: null })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      console.error(e, `${name} Connect: There was an error initializing the wallet`)
      switch (getErrorCode(e)) {
        case 'PROVIDER_NOT_FOUND':
          navigate(`/${keyManager}/failure`)
          break
        case 'WRONG_NETWORK':
          setError(['walletProvider.starknetInjected.errors.wrongNetwork', { name }])
          break
        case 'NO_ACCOUNT':
          setError(['walletProvider.starknetInjected.errors.noAccount', { name }])
          break
        default:
          // Most often the user rejected the connection request in the extension
          setError(['walletProvider.starknetInjected.errors.connectionFailed', { name }])
      }
    } finally {
      setLoading(false)
    }
  }, [dispatch, getAdapter, icon, keyManager, localWallet, name, navigate])

  return (
    <ConnectModal
      headerText={['walletProvider.starknetInjected.connect.header', { name }]}
      bodyText={['walletProvider.starknetInjected.connect.body', { name }]}
      buttonText={'walletProvider.starknetInjected.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
