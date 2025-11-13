import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConnectModal } from '../../components/ConnectModal'
import { TrezorConfig } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const TrezorConnect = () => {
  const navigate = useNavigate()
  const { dispatch: walletDispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setIsLoading(false)
  }, [])

  const handlePair = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    const adapter = await getAdapter(KeyManager.Trezor)
    if (adapter) {
      try {
        const wallet = await adapter.pairDevice()

        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-trezor::pairDevice returned null or undefined')
        }

        const { name, icon } = TrezorConfig
        const deviceId = await wallet.getDeviceID()

        walletDispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Trezor },
        })
        walletDispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        localWallet.setLocalWallet({ type: KeyManager.Trezor, deviceId })

        navigate('/trezor/chains')
      } catch (e: any) {
        console.error(e)
        setErrorLoading(e?.message || 'walletProvider.trezor.errors.unknown')
      }
    }
  }, [getAdapter, navigate, localWallet, setErrorLoading, walletDispatch])

  return (
    <ConnectModal
      headerText={'walletProvider.trezor.connect.header'}
      bodyText={'walletProvider.trezor.connect.body'}
      buttonText={'walletProvider.trezor.connect.button'}
      onPairDeviceClick={handlePair}
      loading={isLoading}
      isButtonDisabled={isLoading}
      error={error}
    />
  )
}
