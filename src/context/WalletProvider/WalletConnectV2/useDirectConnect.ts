/**
 * UGLY POC: Direct WalletConnect connection hook
 * This is an intentionally ugly proof of concept for connecting directly to wallets
 * without showing the WalletConnect modal
 */

import type EthereumProvider from '@walletconnect/ethereum-provider'
import { EthereumProvider as EthProvider } from '@walletconnect/ethereum-provider'
import { useCallback, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

import { walletConnectV2ProviderConfig, WalletConnectV2Config } from './config'

type WalletId = 'metamask' | 'trust' | 'rainbow'

// UGLY: Deep link schemas for different wallets
const UGLY_WALLET_DEEP_LINKS: Record<WalletId, string> = {
  metamask: 'metamask://wc?uri=',
  trust: 'trust://wc?uri=',
  rainbow: 'rainbow://wc?uri=',
}

export const useDirectWalletConnect = () => {
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUri, setCurrentUri] = useState<string | null>(null)

  const showUglyQRCode = useCallback((uri: string, walletName: string) => {
    // UGLY: For desktop, we'd show a custom QR code here
    // For now, just log it
    console.log('🚨 UGLY POC: Show QR for', walletName)
    console.log('🚨 UGLY URI:', uri)

    // In a real implementation, you'd render a QR code modal here
    // For POC, we'll just alert the user
    alert(`UGLY POC: Copy this URI and scan with ${walletName}:\n\n${uri}`)
  }, [])

  const connectToWallet = useCallback(
    async (walletId: WalletId) => {
      setIsConnecting(true)
      setError(null)

      try {
        console.log('🚨 UGLY POC: Starting direct connection to', walletId)

        // Get the adapter
        const adapter = await getAdapter(KeyManager.WalletConnectV2)
        if (!adapter) {
          throw new Error('UGLY ERROR: WalletConnectV2 adapter not found')
        }

        // Create provider WITHOUT modal (the ugly way)
        const uglyConfig = {
          ...walletConnectV2ProviderConfig,
          showQrModal: false, // UGLY: No modal!
          qrModalOptions: undefined, // UGLY: Remove modal options to avoid type conflicts
        }

        console.log('🚨 UGLY: Creating provider without modal')
        const provider = await EthProvider.init(uglyConfig as any) // UGLY: Type cast for POC

        // Set up the UGLY URI handler
        provider.on('display_uri', (uri: string) => {
          console.log('🚨 UGLY: Got URI from provider:', uri)
          setCurrentUri(uri)

          const deepLink = UGLY_WALLET_DEEP_LINKS[walletId]
          if (!deepLink) {
            console.error('🚨 UGLY ERROR: No deep link for wallet:', walletId)
            return
          }

          const fullDeepLink = deepLink + encodeURIComponent(uri)

          if (isMobile) {
            // UGLY: Mobile - direct deep link
            console.log('🚨 UGLY: Opening mobile deep link:', fullDeepLink)
            window.location.href = fullDeepLink
          } else {
            // UGLY: Desktop - show QR
            console.log('🚨 UGLY: Desktop detected, showing QR')
            showUglyQRCode(uri, walletId)
          }
        })

        // UGLY: Trigger the connection (this fires display_uri event)
        console.log('🚨 UGLY: Calling provider.enable()')
        await provider.enable()

        // UGLY SUCCESS: Wrap in HDWallet
        console.log('🚨 UGLY SUCCESS: Connection established!')

        // Import and use the HDWallet wrapper
        const { WalletConnectV2HDWallet } = await import('@shapeshiftoss/hdwallet-walletconnectv2')
        const wallet = new WalletConnectV2HDWallet(provider)

        const deviceId = await wallet.getDeviceID()
        const { name, icon } = WalletConnectV2Config

        // Update state (same as normal flow)
        dispatch({
          type: WalletActions.SET_WCV2_PROVIDER,
          payload: provider as unknown as EthereumProvider,
        })

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet,
            name: `${name} (UGLY DIRECT)`, // UGLY: Add marker to name
            icon,
            deviceId,
            connectedType: KeyManager.WalletConnectV2
          },
        })

        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })

        localWallet.setLocalWallet({ type: KeyManager.WalletConnectV2, deviceId })

        console.log('🚨 UGLY POC: Direct connection complete!')
        setCurrentUri(null)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'UGLY: Unknown error'
        console.error('🚨 UGLY ERROR:', errorMsg)
        setError(errorMsg)
        throw e
      } finally {
        setIsConnecting(false)
      }
    },
    [dispatch, getAdapter, localWallet, showUglyQRCode],
  )

  return {
    connectToWallet,
    isConnecting,
    error,
    currentUri,
  }
}