/**
 * Direct WalletConnect connection hook
 * Connects directly to specific wallets without showing the WalletConnect modal
 */

import type EthereumProvider from '@walletconnect/ethereum-provider'
import { EthereumProvider as EthProvider } from '@walletconnect/ethereum-provider'
import { useCallback, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { WalletConnectV2Config, walletConnectV2ProviderConfig } from './config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

type WalletConnectWalletId = 'metamask' | 'trust' | 'zerion'

/**
 * Deep link schemas for WalletConnect direct wallet connections
 *
 * This bypasses the WalletConnect modal while maintaining a real WalletConnect connection.
 * The modal is purely UI - the protocol works without it through the EthereumProvider.
 *
 * References:
 * - MetaMask: metamask://wc?uri={uri}
 * - Trust: trust://wc?uri={uri} (custom scheme to avoid webpage redirect)
 * - Zerion: zerion://wc?uri={uri}
 *
 * See docs/walletconnect-direct-connection.md for comprehensive documentation
 */
const WALLET_DEEP_LINKS: Record<WalletConnectWalletId, string> = {
  metamask: 'metamask://wc?uri=',
  trust: 'trust://wc?uri=', // Changed to custom scheme to avoid webpage redirect
  zerion: 'zerion://wc?uri=',
}

export const useDirectWalletConnect = () => {
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUri, setCurrentUri] = useState<string | null>(null)

  const showQRCode = useCallback((uri: string, walletName: string) => {
    // For desktop, show QR code
    // In a real implementation, you'd render a QR code modal here
    // For POC, we'll just alert the user
    alert(`Copy this URI and scan with ${walletName}:\n\n${uri}`)
  }, [])

  const connectToWallet = useCallback(
    async (walletId: WalletConnectWalletId) => {
      setIsConnecting(true)
      setError(null)

      try {
        // Get the adapter
        const adapter = await getAdapter(KeyManager.WalletConnectV2)
        if (!adapter) {
          throw new Error('WalletConnectV2 adapter not found')
        }

        // Create provider WITHOUT modal
        const providerConfig = {
          ...walletConnectV2ProviderConfig,
          showQrModal: false, // No modal
          qrModalOptions: undefined, // Remove modal options to avoid type conflicts
        }

        const provider = await EthProvider.init(providerConfig as any)

        // Store provider globally for mobile connection detection
        if (isMobile) {
          ;(window as any).walletConnectProvider = provider
        }

        // Set up the URI handler
        provider.on('display_uri', (uri: string) => {
          setCurrentUri(uri)

          const deepLink = WALLET_DEEP_LINKS[walletId]
          if (!deepLink) {
            return
          }

          const fullDeepLink = deepLink + encodeURIComponent(uri)

          if (isMobile) {
            // Mobile - direct deep link
            // Try window.open to keep the page alive
            const opened = window.open(fullDeepLink, '_blank')

            // Fallback to location.href if window.open fails
            if (!opened) {
              window.location.href = fullDeepLink
            }
          } else {
            // Desktop - show QR
            showQRCode(uri, walletId)
          }
        })

        // Add connection event listeners
        provider.on('connect', (_info: any) => {
          // Update state when connection succeeds on mobile
          if (isMobile) {
            setIsConnecting(false)
            // We'll handle the wallet setup in the promise handler
          }
        })

        provider.on('disconnect', () => {
          // Provider disconnected
        })

        provider.on('session_event', (_event: any) => {
          // Session event
        })

        // Trigger the connection (this fires display_uri event)
        // Handle mobile and desktop differently
        if (isMobile) {
          // Start connection but don't await on mobile
          provider
            .enable()
            .then(async _accounts => {
              // Wrap in HDWallet and update state
              const { WalletConnectV2HDWallet } = await import(
                '@shapeshiftoss/hdwallet-walletconnectv2'
              )
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
                  name, // Use same name as regular WalletConnect
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

              // Don't close modal here - let the button's polling handle it
              // dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

              setIsConnecting(false)
              setCurrentUri(null)
            })
            .catch(err => {
              setError(err.message || 'Mobile connection failed')
              setIsConnecting(false)
            })

          // Don't continue with the rest of the function on mobile
          return
        } else {
          // Desktop: await normally
          try {
            await provider.enable()
          } catch (enableError) {
            throw enableError
          }
        }

        // Wrap in HDWallet
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
            name, // Use same name as regular WalletConnect
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

        // Don't close modal here - let the button's polling handle it
        // dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

        setCurrentUri(null)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error'
        setError(errorMsg)
        throw e
      } finally {
        setIsConnecting(false)
      }
    },
    [dispatch, getAdapter, localWallet, showQRCode],
  )

  return {
    connectToWallet,
    isConnecting,
    error,
    currentUri,
  }
}
