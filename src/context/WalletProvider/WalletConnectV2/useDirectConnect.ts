import EthereumProvider from '@walletconnect/ethereum-provider'
import { useCallback, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { WalletConnectV2Config, walletConnectV2ProviderConfig } from './config'
import { WALLET_DEEP_LINKS } from './constants'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const useDirectWalletConnect = () => {
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectToWallet = useCallback(
    async (walletId: 'metamask' | 'trust' | 'zerion') => {
      setIsConnecting(true)
      setError(null)

      try {
        const adapter = await getAdapter(KeyManager.WalletConnectV2)
        if (!adapter) {
          throw new Error('WalletConnectV2 adapter not found')
        }

        const providerConfig = {
          ...walletConnectV2ProviderConfig,
          showQrModal: false,
          qrModalOptions: undefined,
        }

        const provider = await EthereumProvider.init(providerConfig as any)

        if (isMobile) {
          ;(window as any).walletConnectProvider = provider
        }
        const registerWalletConnection = async () => {
          const { WalletConnectV2HDWallet } = await import(
            '@shapeshiftoss/hdwallet-walletconnectv2'
          )
          const wallet = new WalletConnectV2HDWallet(provider)
          const deviceId = await wallet.getDeviceID()
          const { name, icon } = WalletConnectV2Config

          dispatch({
            type: WalletActions.SET_WCV2_PROVIDER,
            payload: provider as unknown as EthereumProvider,
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

          localWallet.setLocalWallet({ type: KeyManager.WalletConnectV2, deviceId })
        }

        provider.on('display_uri', (uri: string) => {
          const deepLink = WALLET_DEEP_LINKS[walletId]
          if (!deepLink) return

          const fullDeepLink = deepLink + encodeURIComponent(uri)
          const opened = window.open(fullDeepLink, '_blank')
          if (!opened) {
            window.location.href = fullDeepLink
          }
        })

        provider.on('connect', () => {
          if (isMobile) {
            setIsConnecting(false)
          }
        })

        if (isMobile) {
          provider
            .enable()
            .then(async _accounts => {
              await registerWalletConnection()
              setIsConnecting(false)
            })
            .catch(err => {
              setError(err.message || 'Mobile connection failed')
              setIsConnecting(false)
            })
          return
        }

        await provider.enable()
        await registerWalletConnection()
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
    connectToWallet,
    isConnecting,
    error,
  }
}
