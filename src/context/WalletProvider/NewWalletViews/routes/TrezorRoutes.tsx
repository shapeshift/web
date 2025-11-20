import { useCallback, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { PairBody } from '../components/PairBody'

import { TrezorIcon } from '@/components/Icons/TrezorIcon'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const Icon = TrezorIcon
const name = 'Trezor'

export const TrezorRoutes = () => {
  const { dispatch: walletDispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const icon = useMemo(() => <Icon boxSize='64px' />, [])

  const handlePair = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    const adapter = await getAdapter(KeyManager.Trezor)
    if (adapter) {
      try {
        const wallet = await adapter.pairDevice()

        if (!wallet) {
          setError('walletProvider.errors.walletNotFound')
          setIsLoading(false)
          return
        }

        const deviceId = await wallet.getDeviceID()

        walletDispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon: Icon, deviceId, connectedType: KeyManager.Trezor },
        })
        walletDispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        localWallet.setLocalWallet({ type: KeyManager.Trezor, deviceId })

        walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'walletProvider.trezor.errors.unknown')
        setIsLoading(false)
      }
    }
  }, [getAdapter, localWallet, walletDispatch])

  const pairBody = useMemo(
    () => (
      <PairBody
        icon={icon}
        headerTranslation='walletProvider.trezor.connect.header'
        bodyTranslation='walletProvider.trezor.connect.body'
        buttonTranslation='walletProvider.trezor.connect.button'
        isLoading={isLoading}
        onPairDeviceClick={handlePair}
        error={error}
      />
    ),
    [error, handlePair, icon, isLoading],
  )

  return (
    <Routes>
      <Route path='/*' element={pairBody} />
    </Routes>
  )
}
