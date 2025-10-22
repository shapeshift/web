/**
 * UGLY POC: Direct WalletConnect connection hook
 * This is an intentionally ugly proof of concept for connecting directly to wallets
 * without showing the WalletConnect modal
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
 * UGLY: Deep link schemas for WalletConnect direct wallet connections
 *
 * THE HACK EXPLAINED:
 * This whole feature is essentially a hack to bypass the WalletConnect modal while still
 * maintaining a real WalletConnect connection. Here's how it works:
 *
 * 1. Every wallet that supports WalletConnect has a deep link format that accepts WC URIs
 *    - These deep links vary in format (custom scheme vs universal links)
 *    - But they all ultimately do the same thing: open the wallet app with the WC connection URI
 *
 * 2. We instantiate a WalletConnect adapter WITHOUT showing the modal
 *    - Normally, the adapter's only job is to trigger the modal
 *    - But the adapter itself doesn't do much - it's just a thin wrapper
 *    - The real magic happens in the EthereumProvider from @walletconnect/ethereum-provider
 *
 * 3. The adapter establishes a WebSocket connection through WalletConnect's relay servers
 *    - This happens regardless of whether the modal is shown
 *    - The relay server facilitates encrypted communication between dApp and wallet
 *    - The modal is purely UI - the protocol works without it
 *
 * 4. Once connected, everything works exactly as if we used the modal
 *    - Signing transactions
 *    - Sending transactions
 *    - Reading wallet state
 *    - All WalletConnect functionality is preserved
 *
 * So we're not bypassing WalletConnect - we're bypassing the MODAL.
 * The connection, security, and functionality are all standard WalletConnect v2.
 *
 * To add a new wallet:
 * 1. Find the wallet's WalletConnect deep link format using Claude with this prompt:
 *    "Find [WalletName]'s WalletConnect deep link URI scheme from their official docs or WalletConnect registry"
 * 2. Add the wallet to the WalletConnectWalletId type union above
 * 3. Add the deep link format to this Record below
 *
 * References:
 * - MetaMask: Standard mobile deep link schema - metamask://wc?uri={uri}
 * - Trust: Uses universal link instead of custom schema - https://link.trustwallet.com/wc?uri={uri}
 *   Source: https://developer.trustwallet.com/developer/develop-for-trust/deeplinking
 * - Zerion: Standard mobile deep link schema - zerion://wc?uri={uri}
 *   Source: https://developers.zerion.io/reference/initiate-a-connection-from-dapp-to-zerion-wallet
 *
 * See docs/walletconnect-direct-connection.md for comprehensive documentation
 */
const UGLY_WALLET_DEEP_LINKS: Record<WalletConnectWalletId, string> = {
  metamask: 'metamask://wc?uri=',
  trust: 'https://link.trustwallet.com/wc?uri=',
  zerion: 'zerion://wc?uri=',
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
    async (walletId: WalletConnectWalletId) => {
      console.log('🚨 UGLY START: connectToWallet called with:', walletId)
      console.log('🚨 UGLY: Platform is mobile?', isMobile)

      setIsConnecting(true)
      setError(null)

      try {
        console.log('🚨 UGLY POC: Starting direct connection to', walletId)

        // Get the adapter
        const adapter = await getAdapter(KeyManager.WalletConnectV2)
        console.log('🚨 UGLY: Got adapter:', adapter)
        if (!adapter) {
          throw new Error('UGLY ERROR: WalletConnectV2 adapter not found')
        }

        // Create provider WITHOUT modal (the ugly way)
        const uglyConfig = {
          ...walletConnectV2ProviderConfig,
          showQrModal: false, // UGLY: No modal!
          qrModalOptions: undefined, // UGLY: Remove modal options to avoid type conflicts
        }

        console.log('🚨 UGLY: Creating provider with config:', uglyConfig)
        const provider = await EthProvider.init(uglyConfig as any) // UGLY: Type cast for POC
        console.log('🚨 UGLY: Provider created:', provider)

        // Store provider globally for debugging on mobile
        if (isMobile) {
          ;(window as any).uglyProvider = provider
          console.log('🚨 UGLY MOBILE: Stored provider globally as window.uglyProvider')
        }

        // Set up the UGLY URI handler
        provider.on('display_uri', (uri: string) => {
          console.log('🚨🚨🚨 UGLY: display_uri EVENT FIRED! URI:', uri)
          setCurrentUri(uri)

          const deepLink = UGLY_WALLET_DEEP_LINKS[walletId]
          if (!deepLink) {
            console.error('🚨 UGLY ERROR: No deep link for wallet:', walletId)
            return
          }

          const fullDeepLink = deepLink + encodeURIComponent(uri)
          console.log('🚨 UGLY: Full deep link constructed:', fullDeepLink)

          if (isMobile) {
            // UGLY: Mobile - direct deep link
            console.log('🚨 UGLY: MOBILE DETECTED - Opening deep link NOW')
            console.log('🚨 UGLY: Deep link URL:', fullDeepLink)

            // Try window.open to keep the page alive
            const opened = window.open(fullDeepLink, '_blank')
            console.log('🚨 UGLY: window.open result:', opened)

            // Fallback to location.href if window.open fails
            if (!opened) {
              console.log('🚨 UGLY: window.open failed, using location.href fallback')
              window.location.href = fullDeepLink
            }

            console.log('🚨 UGLY: Deep link opened, waiting for wallet response...')
          } else {
            // UGLY: Desktop - show QR
            console.log('🚨 UGLY: DESKTOP DETECTED - Showing QR/alert')
            showUglyQRCode(uri, walletId)
          }
        })

        // Add connection event listeners
        provider.on('connect', (info: any) => {
          console.log('🚨 UGLY: PROVIDER CONNECTED!', info)

          // UGLY: Update state when connection succeeds on mobile
          if (isMobile) {
            console.log('🚨 UGLY MOBILE: Connection established, updating state...')
            setIsConnecting(false)
            // We'll handle the wallet setup in the promise handler
          }
        })

        provider.on('disconnect', () => {
          console.log('🚨 UGLY: Provider disconnected')
        })

        provider.on('session_event', (event: any) => {
          console.log('🚨 UGLY: Session event:', event)
        })

        // UGLY: Trigger the connection (this fires display_uri event)
        console.log('🚨 UGLY: About to call provider.enable()...')

        // UGLY: Handle mobile and desktop differently
        if (isMobile) {
          console.log('🚨 UGLY MOBILE: Starting async connection flow')

          // Start connection but don't await on mobile
          provider
            .enable()
            .then(async accounts => {
              console.log('🚨 UGLY MOBILE SUCCESS: Connection completed!', accounts)

              // UGLY SUCCESS: Wrap in HDWallet and update state
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
                  name: `${name} (UGLY DIRECT)`, // UGLY: Add marker to name
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

              // UGLY: Auto-close modal on successful connection
              dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

              console.log('🚨 UGLY MOBILE: State updated successfully!')
              setIsConnecting(false)
              setCurrentUri(null)
            })
            .catch(err => {
              console.error('🚨 UGLY MOBILE ERROR: Connection failed:', err)
              setError(err.message || 'UGLY: Mobile connection failed')
              setIsConnecting(false)
            })

          console.log('🚨 UGLY MOBILE: Returning early - connection will complete async')

          // Don't continue with the rest of the function on mobile
          return
        } else {
          // Desktop: await normally
          try {
            console.log('🚨 UGLY DESKTOP: Awaiting provider.enable()...')
            const accounts = await provider.enable()
            console.log('🚨 UGLY DESKTOP SUCCESS: provider.enable() returned accounts:', accounts)
          } catch (enableError) {
            console.error('🚨 UGLY ERROR: provider.enable() failed:', enableError)
            throw enableError
          }
        }

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
            connectedType: KeyManager.WalletConnectV2,
          },
        })

        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })

        localWallet.setLocalWallet({ type: KeyManager.WalletConnectV2, deviceId })

        // UGLY: Auto-close modal on successful connection
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

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
