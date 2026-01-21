import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { PairBody } from '../components/PairBody'
import { TrezorCallback } from './TrezorCallback'
import { TrezorDeepLinkTest } from './TrezorDeepLinkTest'

import { TrezorIcon } from '@/components/Icons/TrezorIcon'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'

const Icon = TrezorIcon
const name = 'Trezor'
const STORAGE_KEY_RESPONSE = 'trezor_deeplink_response'
const TREZOR_DEEPLINK_REDIRECT_ERROR = 'TREZOR_DEEPLINK_REDIRECT'

export const TrezorRoutes = () => {
  const { dispatch: walletDispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAutoRetried = useRef(false)

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
        if (e?.message === TREZOR_DEEPLINK_REDIRECT_ERROR) {
          console.log(
            '[TrezorRoutes] Deep link redirect initiated, awaiting return from Trezor Suite',
          )
          return
        }
        console.error(e)
        setError(e?.message || 'walletProvider.trezor.errors.unknown')
        setIsLoading(false)
      }
    }
  }, [getAdapter, localWallet, walletDispatch])

  useEffect(() => {
    if (!isMobile || hasAutoRetried.current) return

    const storedResponse = localStorage.getItem(STORAGE_KEY_RESPONSE)
    if (storedResponse) {
      console.log('[TrezorRoutes] Found stored deep link response, auto-retrying pairing')
      hasAutoRetried.current = true
      handlePair()
    }
  }, [handlePair])

  const bodyTranslation = isMobile
    ? 'walletProvider.trezor.connect.bodyMobile'
    : 'walletProvider.trezor.connect.body'

  const pairBody = useMemo(
    () => (
      <PairBody
        icon={icon}
        headerTranslation='walletProvider.trezor.connect.header'
        bodyTranslation={bodyTranslation}
        buttonTranslation='walletProvider.trezor.connect.button'
        isLoading={isLoading}
        onPairDeviceClick={handlePair}
        error={error}
      />
    ),
    [bodyTranslation, error, handlePair, icon, isLoading],
  )

  return (
    <Routes>
      <Route path='/callback' element={<TrezorCallback />} />
      <Route path='/test' element={<TrezorDeepLinkTest />} />
      <Route path='/*' element={pairBody} />
    </Routes>
  )
}
