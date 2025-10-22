import type EthereumProviderType from '@walletconnect/ethereum-provider'
import EthereumProvider from '@walletconnect/ethereum-provider'
import type { Dispatch } from 'react'
import { useCallback, useState } from 'react'

import { WalletConnectV2Config, walletConnectV2DirectProviderConfig } from './config'
import type { WalletConnectWalletId } from './constants'

import type { ActionTypes } from '@/context/WalletProvider/actions'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const openDeepLink = (walletId: WalletConnectWalletId, uri: string) => {
  // Build deep link directly from wallet ID since they match the schemes
  const deepLink = `${walletId}://wc?uri=${encodeURIComponent(uri)}`

  const opened = window.open(deepLink, '_blank')
  if (!opened) {
    window.location.href = deepLink
  }
}

const setWallet = async (
  provider: EthereumProvider,
  dispatch: Dispatch<ActionTypes>,
  localWallet: ReturnType<typeof useLocalWallet>,
) => {
  const { WalletConnectV2HDWallet } = await import('@shapeshiftoss/hdwallet-walletconnectv2')
  const wallet = new WalletConnectV2HDWallet(provider)
  const deviceId = await wallet.getDeviceID()
  const { name, icon } = WalletConnectV2Config

  dispatch({
    type: WalletActions.SET_WCV2_PROVIDER,
    payload: provider as unknown as EthereumProviderType,
  })

  dispatch({
    type: WalletActions.SET_WALLET,
    payload: {
      wallet,
      name,
      icon,
      deviceId,
      connectedType: KeyManager.WalletConnectV2,
    },
  })

  dispatch({
    type: WalletActions.SET_IS_CONNECTED,
    payload: true,
  })

  // Close the modal after successful connection
  dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

  localWallet.setLocalWallet({ type: KeyManager.WalletConnectV2, deviceId })
}

export const useDirectWalletConnect = () => {
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(
    async (walletId: WalletConnectWalletId) => {
      setIsConnecting(true)
      setError(null)

      try {
        const adapter = await getAdapter(KeyManager.WalletConnectV2)
        if (!adapter) {
          throw new Error('WalletConnectV2 adapter not found')
        }

        const provider = await EthereumProvider.init(walletConnectV2DirectProviderConfig as any)

        provider.on('display_uri', (uri: string) => openDeepLink(walletId, uri))

        await provider.enable()
        await setWallet(provider, dispatch, localWallet)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error'
        setError(errorMsg)
        throw e
      } finally {
        setIsConnecting(false)
      }
    },
    [dispatch, getAdapter, localWallet],
  )

  return {
    connect,
    isConnecting,
    error,
  }
}
