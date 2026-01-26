import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { TonConnectUI } from '@tonconnect/ui-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConnectModal } from '../../components/ConnectModal'
import { TonConnectConfig } from '../config'
import type { TonConnectAdapter } from '../TonConnectAdapter'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import type { AdaptersByKeyManager } from '@/context/WalletProvider/types'
import { useWallet } from '@/hooks/useWallet/useWallet'

let tonConnectInstance: TonConnectUI | null = null

const getTonConnectInstance = (): TonConnectUI => {
  if (!tonConnectInstance) {
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`
    tonConnectInstance = new TonConnectUI({
      manifestUrl,
    })
  }
  return tonConnectInstance
}

export const TonConnectConnect = () => {
  const navigate = useNavigate()
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tonConnect = useMemo(() => getTonConnectInstance(), [])

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const adapter = (await (
        getAdapter as <K extends keyof AdaptersByKeyManager>(
          keyManager: K,
        ) => Promise<AdaptersByKeyManager[K] | null>
      )(KeyManager.TonConnect)) as TonConnectAdapter | null

      if (!adapter) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        return
      }

      adapter.setTonConnect(tonConnect)

      const wallet = await adapter.pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to TonConnectAdapter::pairDevice returned null or undefined')
      }

      const { name, icon } = TonConnectConfig
      const deviceId = await wallet.getDeviceID()
      const isLocked = await wallet.isLocked()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet: wallet as unknown as HDWallet,
          name,
          icon,
          deviceId,
          connectedType: KeyManager.TonConnect,
        },
      })
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })
      localWallet.setLocalWallet({ type: KeyManager.TonConnect, deviceId })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      console.error(e, 'TonConnect Connect: There was an error initializing the wallet')
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setErrorLoading(errorMessage)
      navigate('/tonconnect/failure')
    }

    setLoading(false)
  }, [dispatch, getAdapter, navigate, localWallet, setErrorLoading, tonConnect])

  useEffect(() => {
    const unsubscribe = tonConnect.onStatusChange(wallet => {
      if (!wallet && !loading) {
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [tonConnect, dispatch, loading])

  return (
    <ConnectModal
      headerText={'walletProvider.tonConnect.connect.header'}
      bodyText={'walletProvider.tonConnect.connect.body'}
      buttonText={'walletProvider.tonConnect.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
