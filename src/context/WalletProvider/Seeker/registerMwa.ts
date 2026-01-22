/**
 * Register Mobile Wallet Adapter via Wallet Standard
 *
 * This uses @solana-mobile/wallet-standard-mobile to register MWA as a wallet option.
 * When running on a compatible device (Android Chrome or Seeker), this will enable
 * connection to MWA-compatible wallets like Seeker's Seed Vault.
 *
 * @see https://docs.solanamobile.com/mobile-wallet-adapter/web-installation
 */
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from '@solana-mobile/wallet-standard-mobile'

import { isMobile } from '@/lib/globals'

/**
 * App identity for MWA authorization
 */
const APP_IDENTITY = {
  name: 'ShapeShift',
  uri: 'https://app.shapeshift.com',
  icon: '/favicon.ico',
}

/**
 * Supported Solana chains
 */
const SUPPORTED_CHAINS: ('solana:mainnet' | 'solana:devnet' | 'solana:testnet')[] = [
  'solana:mainnet',
]

let isRegistered = false

/**
 * Register Mobile Wallet Adapter as a wallet option via Wallet Standard
 *
 * This should be called once at app initialization. On compatible devices,
 * it will make Seeker (and other MWA-compatible wallets) appear in the
 * wallet selection UI.
 *
 * The function is idempotent - calling it multiple times has no effect.
 */
export const registerMobileWalletAdapter = (): void => {
  // Only register once
  if (isRegistered) {
    console.debug('[MWA] Already registered')
    return
  }

  // Only register in mobile context (React Native WebView or mobile browser)
  // On desktop, MWA isn't available anyway
  if (!isMobile && typeof navigator !== 'undefined' && !navigator.userAgent.includes('Android')) {
    console.debug('[MWA] Skipping registration - not on mobile/Android')
    return
  }

  try {
    registerMwa({
      appIdentity: APP_IDENTITY,
      authorizationCache: createDefaultAuthorizationCache(),
      chains: SUPPORTED_CHAINS,
      chainSelector: createDefaultChainSelector(),
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    })

    isRegistered = true
    console.info('[MWA] Mobile Wallet Adapter registered via Wallet Standard')
  } catch (error) {
    // This can fail if MWA isn't available (e.g., on iOS or unsupported browser)
    console.warn('[MWA] Failed to register Mobile Wallet Adapter:', error)
  }
}

/**
 * Check if MWA is registered
 */
export const isMwaRegistered = (): boolean => {
  return isRegistered
}
